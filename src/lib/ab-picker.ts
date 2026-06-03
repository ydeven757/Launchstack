import { createHash } from "node:crypto";

/**
 * Deterministic per-(seed, variants) variant assignment.
 *
 * Sticky-by-cookie: passing the same seed always returns the same variant.
 * Distribution-by-weight: across many distinct seeds, variants are chosen
 * in proportion to their `weight`.
 *
 * Pure function — no I/O, no `server-only`. Safe to import from anywhere.
 */
export function pickVariant<T extends { id: string; weight: number }>(variants: T[], seed: string): T {
  if (variants.length === 0) throw new Error("pickVariant: empty variants array");
  const totalWeight = variants.reduce((acc, v) => acc + Math.max(0, v.weight), 0);
  if (totalWeight === 0) return variants[0];
  const hash = createHash("sha256").update(seed).digest();
  const intVal = hash.readUInt32BE(0);
  const r = (intVal / 0xffffffff) * totalWeight;
  let acc = 0;
  for (const v of variants) {
    acc += Math.max(0, v.weight);
    if (r <= acc) return v;
  }
  return variants[variants.length - 1];
}
