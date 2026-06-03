import { describe, it, expect } from "vitest";
import { pickVariant } from "./ab-picker";

describe("pickVariant", () => {
  const variants = [
    { id: "A", weight: 50 },
    { id: "B", weight: 50 },
  ];

  it("is sticky: same seed always returns the same variant", () => {
    const seed = "cookie-1234567890";
    const first = pickVariant(variants, seed);
    for (let i = 0; i < 50; i++) {
      expect(pickVariant(variants, seed).id, `iteration ${i}`).toBe(first.id);
    }
  });

  it("split is approximately uniform for equal weights (≥ 5000 distinct seeds)", () => {
    let a = 0, b = 0;
    for (let i = 0; i < 5000; i++) {
      const seed = `cookie-${i}-${Math.random().toString(36)}`;
      const r = pickVariant(variants, seed);
      if (r.id === "A") a++; else b++;
    }
    // Expect roughly 50/50, allow ±3% drift
    const aRatio = a / 5000;
    expect(aRatio, `A=${a} B=${b} ratio=${aRatio}`).toBeGreaterThan(0.47);
    expect(aRatio).toBeLessThan(0.53);
  });

  it("respects weight ratios (80/20 split)", () => {
    const weighted = [{ id: "big", weight: 80 }, { id: "small", weight: 20 }];
    let big = 0, small = 0;
    for (let i = 0; i < 5000; i++) {
      const r = pickVariant(weighted, `seed-${i}-${Math.random()}`);
      if (r.id === "big") big++; else small++;
    }
    const bigRatio = big / 5000;
    expect(bigRatio, `big=${big} small=${small}`).toBeGreaterThan(0.77);
    expect(bigRatio).toBeLessThan(0.83);
  });

  it("returns the first variant when all weights are zero (degenerate edge)", () => {
    const zero = [{ id: "X", weight: 0 }, { id: "Y", weight: 0 }];
    expect(pickVariant(zero, "any-seed").id).toBe("X");
  });

  it("treats negative weights as zero (defensive)", () => {
    const negative = [{ id: "A", weight: -10 }, { id: "B", weight: 100 }];
    for (let i = 0; i < 100; i++) {
      expect(pickVariant(negative, `seed-${i}`).id).toBe("B");
    }
  });

  it("throws on empty variants list (programmer error)", () => {
    expect(() => pickVariant([], "seed")).toThrowError(/empty/i);
  });

  it("different seeds produce different distributions (NOT all the same variant)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      seen.add(pickVariant(variants, `unique-seed-${i}`).id);
    }
    // Across 100 random seeds we should see BOTH variants. (P(all-same) = 2 * 0.5^100, vanishing.)
    expect(seen.size).toBe(2);
  });
});
