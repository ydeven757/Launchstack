/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { BUILTIN_TEMPLATES, type StarterTemplate } from "../src/server/templates/builtin-data";
import { CURATED_MARKETPLACE } from "../src/server/templates/marketplace-curated";

const prisma = new PrismaClient();

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

async function uniqueFunnelSlug(tenantId: string, base: string): Promise<string> {
  let slug = slugify(base) || "funnel";
  let n = 1;
  while (await prisma.funnel.findFirst({ where: { tenantId, slug } })) {
    n += 1; slug = `${slugify(base)}-${n}`;
  }
  return slug;
}

async function uniquePageSlug(tenantId: string, base: string): Promise<string> {
  let slug = slugify(base) || "page";
  let n = 1;
  while (await prisma.page.findFirst({ where: { tenantId, slug } })) {
    n += 1; slug = `${slugify(base)}-${n}`;
  }
  return slug;
}

async function applyTemplateToTenant(tenantId: string, template: StarterTemplate) {
  const funnelSlug = await uniqueFunnelSlug(tenantId, template.funnelName);
  const funnel = await prisma.funnel.create({
    data: { tenantId, name: template.funnelName, description: template.description, slug: funnelSlug, state: "DRAFT" },
  });
  for (let i = 0; i < template.pages.length; i++) {
    const p = template.pages[i];
    const pageSlug = await uniquePageSlug(tenantId, p.name);
    await prisma.page.create({
      data: {
        tenantId, funnelId: funnel.id, type: p.type, name: p.name, slug: pageSlug, position: i,
        blocksJson: JSON.stringify(p.blocks), state: "DRAFT",
      },
    });
  }
  return funnel;
}

async function main() {
  console.log("Seeding…");

  // 1. Built-in templates
  for (const t of BUILTIN_TEMPLATES) {
    await prisma.template.upsert({
      where: { id: t.id },
      update: {
        name: t.name, description: t.description, niche: t.niche,
        trafficSource: t.trafficSource, funnelType: t.funnelType,
        payload: JSON.stringify({ funnelName: t.funnelName, pages: t.pages }),
      },
      create: {
        id: t.id, name: t.name, description: t.description, niche: t.niche,
        trafficSource: t.trafficSource, funnelType: t.funnelType,
        payload: JSON.stringify({ funnelName: t.funnelName, pages: t.pages }),
        isBuiltIn: true, tenantId: null,
      },
    });
  }
  console.log(`  · Templates: ${BUILTIN_TEMPLATES.length} built-in`);

  // 1b. Marketplace products
  for (const p of CURATED_MARKETPLACE) {
    await prisma.marketplaceProduct.upsert({
      where: { network_externalId: { network: p.network, externalId: p.externalId } },
      update: {
        title: p.title, vendor: p.vendor, niche: p.niche, category: p.category,
        gravity: p.gravity, avgPayout: p.avgPayout, initialPayout: p.initialPayout, rebillPayout: p.rebillPayout,
        currency: p.currency, commission: p.commission, hopUrl: p.hopUrl, salesPageUrl: p.salesPageUrl,
        description: p.description, recommendedFunnel: p.recommendedFunnel,
        tags: JSON.stringify(p.tags), active: true, syncedAt: new Date(),
      },
      create: {
        network: p.network, externalId: p.externalId,
        title: p.title, vendor: p.vendor, niche: p.niche, category: p.category,
        gravity: p.gravity, avgPayout: p.avgPayout, initialPayout: p.initialPayout, rebillPayout: p.rebillPayout,
        currency: p.currency, commission: p.commission, hopUrl: p.hopUrl, salesPageUrl: p.salesPageUrl,
        description: p.description, recommendedFunnel: p.recommendedFunnel,
        tags: JSON.stringify(p.tags),
      },
    });
  }
  console.log(`  · Marketplace: ${CURATED_MARKETPLACE.length} curated offers`);

  // 2. Users
  const demoPwd = await hash("demo1234", 12);
  const adminPwd = await hash("admin1234", 12);

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@launchstack.local" },
    update: {},
    create: { email: "demo@launchstack.local", name: "Demo User", passwordHash: demoPwd },
  });
  await prisma.user.upsert({
    where: { email: "admin@launchstack.local" },
    update: { isSuperAdmin: true },
    create: { email: "admin@launchstack.local", name: "Super Admin", passwordHash: adminPwd, isSuperAdmin: true },
  });
  console.log(`  · Users: demo@launchstack.local / demo1234   admin@launchstack.local / admin1234`);

  // 3. Tenants
  await ensureTenant({
    ownerId: demoUser.id, slug: "fitcoach", name: "FitCoach Studio",
    niche: "Health & Fitness", trafficSource: "Paid Social", conversionGoal: "Email opt-in",
    brandPrimary: "#16a34a", templateId: "tpl-leadmagnet-fitness", seedData: true,
  });
  await ensureTenant({
    ownerId: demoUser.id, slug: "moneyreview", name: "Money Review",
    niche: "Personal Finance", trafficSource: "Native Ads", conversionGoal: "Affiliate sale",
    brandPrimary: "#0ea5e9", templateId: "tpl-advertorial-finance", seedData: false,
  });

  console.log("Done.");
}

async function ensureTenant(args: {
  ownerId: string; slug: string; name: string;
  niche: string; trafficSource: string; conversionGoal: string;
  brandPrimary: string; templateId: string; seedData: boolean;
}) {
  const existing = await prisma.tenant.findUnique({ where: { slug: args.slug } });
  const tenant = existing ?? await prisma.tenant.create({
    data: {
      slug: args.slug, name: args.name, niche: args.niche,
      trafficSource: args.trafficSource, conversionGoal: args.conversionGoal,
      brandPrimary: args.brandPrimary, ownerUserId: args.ownerId,
      memberships: { create: { userId: args.ownerId, role: "OWNER" } },
    },
  });
  console.log(`  · Tenant: ${tenant.name} (/${tenant.slug})`);

  const funnelCount = await prisma.funnel.count({ where: { tenantId: tenant.id } });
  if (funnelCount === 0) {
    const tpl = BUILTIN_TEMPLATES.find((t) => t.id === args.templateId);
    if (tpl) {
      const funnel = await applyTemplateToTenant(tenant.id, tpl);
      await prisma.page.updateMany({ where: { funnelId: funnel.id }, data: { state: "PUBLISHED", publishedAt: new Date() } });
      await prisma.funnel.update({ where: { id: funnel.id }, data: { state: "PUBLISHED" } });
      const pages = await prisma.page.findMany({ where: { funnelId: funnel.id } });
      for (const p of pages) {
        await prisma.page.update({ where: { id: p.id }, data: { publishedBlocks: p.blocksJson } });
      }
      console.log(`    · Funnel: ${funnel.name} with ${pages.length} pages (published)`);
    }
  }

  if (!args.seedData) return tenant;

  // Tags
  const tags = await Promise.all(
    ["webinar-attendee", "newsletter", "engaged"].map((name) =>
      prisma.tag.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name } },
        update: {},
        create: { tenantId: tenant.id, name, color: name === "engaged" ? "#16a34a" : "#2563eb" },
      })
    )
  );

  // Contacts
  const contactsCount = await prisma.contact.count({ where: { tenantId: tenant.id } });
  if (contactsCount === 0) {
    const sample = [
      { email: "alex@example.com", firstName: "Alex", lastName: "Park", status: "ENGAGED" },
      { email: "jamie@example.com", firstName: "Jamie", lastName: "Lee", status: "LEAD" },
      { email: "morgan@example.com", firstName: "Morgan", lastName: "Hall", status: "CUSTOMER" },
      { email: "robin@example.com", firstName: "Robin", lastName: "Smith", status: "LEAD" },
      { email: "taylor@example.com", firstName: "Taylor", lastName: "Reed", status: "ENGAGED" },
    ];
    for (const c of sample) {
      const contact = await prisma.contact.create({ data: { tenantId: tenant.id, ...c, utmSource: "facebook" } });
      await prisma.contactTag.create({ data: { tenantId: tenant.id, contactId: contact.id, tagId: tags[1].id } });
      if (c.status !== "LEAD") {
        await prisma.contactTag.create({ data: { tenantId: tenant.id, contactId: contact.id, tagId: tags[2].id } });
      }
      await prisma.activity.create({ data: { tenantId: tenant.id, contactId: contact.id, type: "form_submit", payload: JSON.stringify({ source: "seed" }) } });
    }
    console.log(`    · Seeded ${sample.length} contacts + tags`);
  }

  // Sample events (over 7 days)
  const pages = await prisma.page.findMany({ where: { tenantId: tenant.id } });
  if (pages.length > 0) {
    const eventCount = await prisma.event.count({ where: { tenantId: tenant.id } });
    if (eventCount === 0) {
      const events: { tenantId: string; pageId: string; funnelId: string | null; type: string; utmSource: string | null; createdAt: Date }[] = [];
      const sources = ["facebook", "google", "tiktok", "(direct)", "youtube"];
      for (let d = 6; d >= 0; d--) {
        const day = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
        const visits = 30 + Math.floor(Math.random() * 60);
        const submits = Math.floor(visits * (0.1 + Math.random() * 0.2));
        for (let i = 0; i < visits; i++) {
          const p = pages[i % pages.length];
          events.push({
            tenantId: tenant.id, pageId: p.id, funnelId: p.funnelId, type: "page_view",
            utmSource: sources[Math.floor(Math.random() * sources.length)],
            createdAt: new Date(day.getTime() + Math.random() * 86400000),
          });
        }
        for (let i = 0; i < submits; i++) {
          const p = pages[0];
          events.push({
            tenantId: tenant.id, pageId: p.id, funnelId: p.funnelId, type: "form_submit",
            utmSource: sources[Math.floor(Math.random() * sources.length)],
            createdAt: new Date(day.getTime() + Math.random() * 86400000),
          });
        }
      }
      await prisma.event.createMany({ data: events });
      console.log(`    · Seeded ${events.length} events over 7 days`);
    }
  }

  // Welcome automation
  const automationCount = await prisma.automation.count({ where: { tenantId: tenant.id } });
  if (automationCount === 0) {
    await prisma.automation.create({
      data: {
        tenantId: tenant.id, name: "Welcome series", trigger: "FORM_SUBMITTED",
        stepsJson: JSON.stringify([
          { type: "send_email", config: { subject: "Welcome to " + tenant.name, bodyHtml: `<p>Hi,</p><p>Thanks for signing up to ${tenant.name}.</p>` } },
          { type: "add_tag", config: { tagId: tags[2].id } },
        ]),
        enabled: true,
      },
    });
    console.log(`    · Seeded welcome automation`);
  }

  // Sample offer + cloaked link
  const offerCount = await prisma.offer.count({ where: { tenantId: tenant.id } });
  if (offerCount === 0) {
    const offer = await prisma.offer.create({
      data: {
        tenantId: tenant.id, name: "Sample affiliate offer", network: "Direct",
        payout: 25, currency: "USD", landingUrl: "https://example.com/landing",
      },
    });
    await prisma.affiliateLink.create({
      data: {
        tenantId: tenant.id, offerId: offer.id, slug: `${slugify(tenant.slug)}-sample`,
        target: "https://example.com/landing?utm_source=launchstack",
        utm: JSON.stringify({ source: "launchstack" }),
      },
    });
    console.log(`    · Seeded sample offer + /go/${tenant.slug}-sample link`);
  }
  return tenant;
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
