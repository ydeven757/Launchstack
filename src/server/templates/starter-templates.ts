// Helpers + DB writes for the starter-template library. The pure data (and
// types) live in `./builtin-data.ts` and is shared with the plain-Node seed.
import { prisma } from "../db";
import { tenantDb } from "../tenant";
import { slugify } from "@/lib/utils";
import { BUILTIN_TEMPLATES, type StarterTemplate, type Block } from "./builtin-data";

export { BUILTIN_TEMPLATES, type StarterTemplate, type Block };

function uniqueSlug<T>(getter: (slug: string) => Promise<T | null>): (base: string) => Promise<string> {
  return async (base: string) => {
    let slug = slugify(base) || "item";
    let n = 1;
    while (await getter(slug)) {
      n += 1;
      slug = `${slugify(base)}-${n}`;
    }
    return slug;
  };
}

/**
 * Materializes a starter template into a Tenant: creates a Funnel and its Pages.
 */
export async function applyTemplateToTenant(tenantId: string, template: StarterTemplate) {
  const db = tenantDb(tenantId);
  const funnelSlug = await uniqueSlug<{ id: string }>(
    (slug) => db.funnel.findFirst({ where: { slug } }) as Promise<{ id: string } | null>,
  )(template.funnelName);

  const funnel = await db.funnel.create({
    data: {
      tenantId,
      name: template.funnelName,
      description: template.description,
      slug: funnelSlug,
      state: "DRAFT",
    },
  });

  for (let i = 0; i < template.pages.length; i++) {
    const p = template.pages[i];
    const pageSlug = await uniqueSlug<{ id: string }>(
      (slug) => db.page.findFirst({ where: { slug } }) as Promise<{ id: string } | null>,
    )(p.name);
    await db.page.create({
      data: {
        tenantId,
        funnelId: funnel.id,
        type: p.type,
        name: p.name,
        slug: pageSlug,
        position: i,
        blocksJson: JSON.stringify(p.blocks),
        state: "DRAFT",
        requiresDisclosure: p.type === "ADVERTORIAL" || p.type === "REVIEW",
      },
    });
  }

  return funnel;
}

/** Seed built-in templates into the Template table (called by seed.ts and the admin re-sync). */
export async function seedBuiltinTemplates() {
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
}
