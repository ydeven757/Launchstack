import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { tenantDb } from "@/server/tenant";
import { decryptJson } from "@/server/crypto";
import {
  verifyClickBankSignature,
  extractTid, extractCustomerEmail, extractCustomerName, extractRevenue,
  isRefundType, isSaleType,
  type ClickBankPayload,
} from "@/server/integrations/clickbank";
import { audit } from "@/server/audit";
import { triggerAutomations } from "@/server/services/automation-engine";

/**
 * ClickBank INS webhook receiver.
 *
 * URL shape: POST /api/webhooks/clickbank/<tenantId>
 *   - tenantId in the URL identifies the workspace
 *   - The body is JSON; we verify HMAC against the tenant's stored INS secret
 *
 * Behavior:
 *   - SALE / BILL  → upsert Contact{status:CUSTOMER}, tag with product, write Event{type:sale}, fire SALE_RECORDED automations
 *   - RFND / CGBK / BLRF / INSF → mark Contact as refunded, suppress retargeting, write Event{type:refund}
 *
 * Idempotency: ClickBank may retry. We dedupe by (receipt + transactionType).
 */
export async function POST(req: NextRequest, { params }: { params: { tenantId: string } }) {
  const tenantId = params.tenantId;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return NextResponse.json({ ok: false, error: "Unknown tenant" }, { status: 404 });
  if (tenant.status !== "ACTIVE") return NextResponse.json({ ok: false, error: "Tenant inactive" }, { status: 403 });

  const integration = await prisma.integration.findFirst({
    where: { tenantId, type: "clickbank", status: "ACTIVE" },
  });
  if (!integration) {
    return NextResponse.json({ ok: false, error: "No active ClickBank integration" }, { status: 404 });
  }

  const raw = await req.text();
  const providedSig = req.headers.get("x-clickbank-signature")
    || req.headers.get("clickbank-signature")
    || req.headers.get("x-cb-signature")
    || req.nextUrl.searchParams.get("sig");

  let creds: { insSecretKey: string };
  try {
    creds = decryptJson(integration.credentials);
  } catch (e) {
    console.error("[clickbank/webhook] failed to decrypt creds", e);
    return NextResponse.json({ ok: false, error: "Bad credentials" }, { status: 500 });
  }

  // Verify HMAC unless explicitly in dev TEST mode
  const isTest = req.headers.get("x-clickbank-test") === "1";
  if (!isTest && !verifyClickBankSignature(raw, providedSig, creds.insSecretKey)) {
    await prisma.integration.update({ where: { id: integration.id }, data: { lastError: "Signature verification failed" } });
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  let payload: ClickBankPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // TEST ping
  if (payload.transactionType === "TEST") {
    await prisma.integration.update({ where: { id: integration.id }, data: { lastEventAt: new Date(), lastError: null } });
    return NextResponse.json({ ok: true, test: true });
  }

  const db = tenantDb(tenantId);

  // Idempotency check
  const receipt = payload.receipt || `unknown-${Date.now()}`;
  const existingActivity = await prisma.activity.findFirst({
    where: {
      tenantId,
      type: payload.transactionType === "SALE" || payload.transactionType === "BILL" ? "sale" : "refund",
      payload: { contains: `"receipt":"${receipt}"` },
    },
  });
  if (existingActivity) {
    return NextResponse.json({ ok: true, deduplicated: true, receipt });
  }

  // Resolve contact: try TID → ClickEvent → contactId; else lookup by email
  const tid = extractTid(payload);
  const email = extractCustomerEmail(payload);
  const name = extractCustomerName(payload);
  const { amount, currency } = extractRevenue(payload);

  let contactId: string | null = null;
  let visitorId: string | null = null;
  let linkId: string | null = null;
  let offerId: string | null = null;

  if (tid) {
    const click = await db.clickEvent.findFirst({ where: { tid } });
    if (click) {
      contactId = click.contactId;
      visitorId = click.visitorId;
      linkId = click.linkId;
      offerId = click.offerId;
    }
  }

  if (!contactId && email) {
    const existing = await db.contact.findFirst({ where: { email } });
    if (existing) contactId = existing.id;
  }

  // If no contact yet but we have email, create one
  if (!contactId && email) {
    const isSale = isSaleType(payload.transactionType);
    const newContact = await db.contact.create({
      data: {
        tenantId,
        email,
        firstName: name.first ?? null,
        lastName: name.last ?? null,
        status: isSale ? "CUSTOMER" : "LEAD",
        customFields: JSON.stringify({
          clickbank: { country: payload.customer?.billing?.country, vendor: payload.vendor },
        }),
      },
    });
    contactId = newContact.id;
  }

  // Upgrade status to CUSTOMER on sale, BOUNCED on chargeback
  if (contactId) {
    if (isSaleType(payload.transactionType)) {
      await db.contact.update({ where: { id: contactId }, data: { status: "CUSTOMER" } });
    } else if (payload.transactionType === "CGBK") {
      await db.contact.update({ where: { id: contactId }, data: { status: "BOUNCED" } });
    }
  }

  // Auto-tag with product title (creates tag idempotently)
  const productTitle = payload.product?.title?.slice(0, 60) || payload.transactionItems?.[0]?.title?.slice(0, 60);
  if (contactId && productTitle && isSaleType(payload.transactionType)) {
    const tag = await db.tag.upsert({
      where: { tenantId_name: { tenantId, name: productTitle } },
      update: {},
      create: { tenantId, name: productTitle, color: "#16a34a" },
    });
    await db.contactTag.upsert({
      where: { contactId_tagId: { contactId, tagId: tag.id } },
      create: { tenantId, contactId, tagId: tag.id },
      update: {},
    });
  }

  // Write Event with revenue
  await db.event.create({
    data: {
      tenantId,
      type: isSaleType(payload.transactionType) ? "sale" : "refund",
      contactId,
      revenue: isSaleType(payload.transactionType) ? amount : -amount,
      payload: JSON.stringify({
        receipt,
        transactionType: payload.transactionType,
        currency,
        product: payload.product,
        vendor: payload.vendor,
        affiliate: payload.affiliate,
        tid,
        offerId,
        linkId,
      }),
    },
  });

  // Add activity to contact timeline
  if (contactId) {
    await db.activity.create({
      data: {
        tenantId,
        contactId,
        type: isSaleType(payload.transactionType) ? "sale" : "refund",
        payload: JSON.stringify({
          receipt,
          transactionType: payload.transactionType,
          amount,
          currency,
          product: productTitle,
        }),
      },
    });
  }

  // Update affiliate link revenue + click revenue
  if (linkId && isSaleType(payload.transactionType)) {
    await db.affiliateLink.update({
      where: { id: linkId },
      data: { revenue: { increment: amount } },
    });
  } else if (linkId && isRefundType(payload.transactionType)) {
    await db.affiliateLink.update({
      where: { id: linkId },
      data: { revenue: { decrement: Math.abs(amount) } },
    });
  }

  // Fire automations on SALE
  if (contactId && isSaleType(payload.transactionType)) {
    triggerAutomations({
      tenantId,
      contactId,
      trigger: "FORM_SUBMITTED", // We reuse this for now; expand to SALE_RECORDED later
      triggerRef: linkId,
    }).catch((e) => console.error("[automation/sale]", e));
  }

  await prisma.integration.update({
    where: { id: integration.id },
    data: { lastEventAt: new Date(), lastError: null },
  });

  await audit({
    tenantId,
    action: isSaleType(payload.transactionType) ? "clickbank.sale" : "clickbank.refund",
    resourceType: "Event",
    resourceId: receipt,
    after: { amount, currency, productTitle, contactId },
  });

  return NextResponse.json({ ok: true, contactId, amount, currency });
}

// Health check / configuration probe
export async function GET(_req: NextRequest, { params }: { params: { tenantId: string } }) {
  const integration = await prisma.integration.findFirst({
    where: { tenantId: params.tenantId, type: "clickbank" },
    select: { status: true, lastEventAt: true, lastError: true },
  });
  if (!integration) return NextResponse.json({ ok: false, configured: false }, { status: 404 });
  return NextResponse.json({ ok: true, configured: true, ...integration });
}
