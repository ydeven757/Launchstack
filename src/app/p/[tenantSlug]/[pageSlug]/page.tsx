import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Metadata } from "next";
import { prisma } from "@/server/db";
import { BlockTree } from "@/components/builder/block-renderer";
import { getOrCreateVisitor, VISITOR_COOKIE } from "@/server/services/visitor";
import { resolvePageForVisitor } from "@/server/services/ab";
import { cookies } from "next/headers";

type Params = { tenantSlug: string; pageSlug: string };
type SearchParams = Record<string, string | string[] | undefined>;

async function load(params: Params) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: params.tenantSlug } });
  if (!tenant || tenant.status !== "ACTIVE") return null;
  const page = await prisma.page.findFirst({
    where: { tenantId: tenant.id, slug: params.pageSlug, state: "PUBLISHED" },
  });
  if (!page) return null;
  return { tenant, page };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await load(params);
  if (!data) return { title: "Not found" };
  return {
    title: data.page.seoTitle ?? data.page.name,
    description: data.page.seoDescription ?? undefined,
  };
}

export default async function PublicPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const data = await load(params);
  if (!data) notFound();

  const visitor = await getOrCreateVisitor({ tenantId: data.tenant.id, searchParams }).catch(() => null);
  // Read cookie from the visitor we just created (Next's cookies().get() doesn't see set-in-this-render values)
  const cookieId = visitor?.cookieId ?? cookies().get(VISITOR_COOKIE)?.value ?? null;

  // Resolve A/B variant deterministically per visitor
  const resolved = await resolvePageForVisitor({ pageId: data.page.id, cookieId });
  if (!resolved) notFound();

  // Record page view with variantId in payload (for A/B reporting)
  const h = headers();
  recordView({
    tenantId: data.tenant.id,
    pageId: data.page.id,
    funnelId: data.page.funnelId,
    referrer: h.get("referer"),
    userAgent: h.get("user-agent"),
    utm: {
      source: typeof searchParams.utm_source === "string" ? searchParams.utm_source : null,
      medium: typeof searchParams.utm_medium === "string" ? searchParams.utm_medium : null,
      campaign: typeof searchParams.utm_campaign === "string" ? searchParams.utm_campaign : null,
    },
    visitorId: visitor?.id ?? null,
    contactId: visitor?.contactId ?? null,
    variantId: resolved.variantId,
  }).catch(() => {});

  const requiresDisclosure = data.page.requiresDisclosure;
  const disclosure = data.tenant.disclosureText;

  return (
    <div className="min-h-screen bg-bg">
      {requiresDisclosure && disclosure && (
        <div className="bg-warning/10 border-b border-warning/30 px-4 py-2 text-xs text-fg/80 text-center">
          {disclosure}
        </div>
      )}
      <div className="mx-auto max-w-3xl px-6 py-12">
        <BlockTree
          blocks={resolved.blocks}
          mode="public"
          tenantSlug={data.tenant.slug}
          pageId={data.page.id}
          brandPrimary={data.tenant.brandPrimary}
        />
      </div>
      <footer className="border-t border-border mt-12">
        <div className="mx-auto max-w-3xl px-6 py-4 text-center text-xs text-muted space-y-1">
          <div>{data.tenant.name}</div>
          {data.tenant.legalFooterHtml && (
            <div dangerouslySetInnerHTML={{ __html: data.tenant.legalFooterHtml }} />
          )}
        </div>
      </footer>
    </div>
  );
}

async function recordView(input: {
  tenantId: string;
  pageId: string;
  funnelId: string | null;
  referrer: string | null;
  userAgent: string | null;
  utm: { source: string | null; medium: string | null; campaign: string | null };
  visitorId: string | null;
  contactId: string | null;
  variantId: string | null;
}) {
  try {
    await prisma.event.create({
      data: {
        tenantId: input.tenantId,
        pageId: input.pageId,
        funnelId: input.funnelId,
        contactId: input.contactId,
        type: "page_view",
        referrer: input.referrer,
        userAgent: input.userAgent,
        utmSource: input.utm.source,
        utmMedium: input.utm.medium,
        utmCampaign: input.utm.campaign,
        payload: JSON.stringify({
          visitorId: input.visitorId,
          variantId: input.variantId,
        }),
      },
    });
  } catch {
    // never block render
  }
}
