import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "../db";
import type { Block } from "@/components/builder/block-renderer";
import { safeJsonParse } from "@/lib/utils";

export type ResolvedPage = {
  pageId: string;
  variantId: string | null;
  variantName: string | null;
  blocks: Block[];
};

/**
 * Resolve which page (or variant) a visitor sees.
 *
 * - If page.abEnabled and variants exist: deterministic split by hash(cookieId+pageId)
 *   This means the same visitor always sees the same variant (sticky).
 * - Otherwise: returns the page's own blocks.
 */
export async function resolvePageForVisitor(input: {
  pageId: string;
  cookieId: string | null;
}): Promise<ResolvedPage | null> {
  const page = await prisma.page.findUnique({ where: { id: input.pageId } });
  if (!page) return null;

  if (page.abEnabled) {
    const variants = await prisma.pageVariant.findMany({
      where: { pageId: page.id },
      orderBy: { createdAt: "asc" },
    });
    if (variants.length > 0) {
      const variant = pickVariant(variants, input.cookieId ?? page.id);
      return {
        pageId: page.id,
        variantId: variant.id,
        variantName: variant.name,
        blocks: safeJsonParse<Block[]>(variant.blocksJson, []),
      };
    }
  }

  return {
    pageId: page.id,
    variantId: null,
    variantName: null,
    blocks: safeJsonParse<Block[]>(page.publishedBlocks ?? page.blocksJson, []),
  };
}

function pickVariant<T extends { id: string; weight: number }>(variants: T[], seed: string): T {
  const totalWeight = variants.reduce((acc, v) => acc + Math.max(0, v.weight), 0);
  if (totalWeight === 0) return variants[0];
  const hash = createHash("sha256").update(seed).digest();
  // Use first 4 bytes of hash as deterministic 0-1
  const intVal = hash.readUInt32BE(0);
  const r = (intVal / 0xffffffff) * totalWeight;
  let acc = 0;
  for (const v of variants) {
    acc += Math.max(0, v.weight);
    if (r <= acc) return v;
  }
  return variants[variants.length - 1];
}

export async function variantPerformance(pageId: string) {
  const variants = await prisma.pageVariant.findMany({ where: { pageId }, orderBy: { createdAt: "asc" } });
  if (variants.length === 0) return [];

  // Pull events tagged with variantId (we store it in Event.payload JSON)
  const events = await prisma.event.findMany({
    where: { pageId, type: { in: ["page_view", "form_submit", "sale"] } },
    select: { type: true, payload: true, revenue: true },
  });

  const byVariant = new Map<string, { visits: number; submits: number; sales: number; revenue: number }>();
  for (const v of variants) byVariant.set(v.id, { visits: 0, submits: 0, sales: 0, revenue: 0 });
  byVariant.set("_none", { visits: 0, submits: 0, sales: 0, revenue: 0 });

  for (const e of events) {
    const meta = safeJsonParse<{ variantId?: string }>(e.payload, {});
    const key = meta.variantId && byVariant.has(meta.variantId) ? meta.variantId : "_none";
    const row = byVariant.get(key)!;
    if (e.type === "page_view") row.visits += 1;
    if (e.type === "form_submit") row.submits += 1;
    if (e.type === "sale") { row.sales += 1; row.revenue += e.revenue ?? 0; }
  }

  return variants.map((v) => ({
    variantId: v.id,
    name: v.name,
    weight: v.weight,
    isControl: v.isControl,
    ...byVariant.get(v.id)!,
    convRate: byVariant.get(v.id)!.visits === 0 ? 0 : byVariant.get(v.id)!.submits / byVariant.get(v.id)!.visits,
  }));
}
