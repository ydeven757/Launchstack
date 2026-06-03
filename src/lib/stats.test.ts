import { describe, it, expect } from "vitest";
import { compareVariants } from "./stats";

describe("compareVariants — two-proportion z-test", () => {
  it("returns isSignificant=true for a clear winner with large samples", () => {
    // Control: 500 visits, 50 conversions (10% rate)
    // Treatment: 500 visits, 80 conversions (16% rate)
    // Lift: +60%, z ≈ 2.86, p ≈ 0.004
    const r = compareVariants({ visits: 500, conversions: 50 }, { visits: 500, conversions: 80 });
    expect(r.control.rate).toBeCloseTo(0.10, 4);
    expect(r.treatment.rate).toBeCloseTo(0.16, 4);
    expect(r.liftPct).toBeCloseTo(0.6, 2);
    expect(r.pValue).toBeLessThan(0.05);
    expect(r.isSignificant).toBe(true);
    expect(r.warning).toBeUndefined();
  });

  it("returns isSignificant=false when the difference is within noise", () => {
    // 1000 / 100 vs 1000 / 102 — basically the same rate
    const r = compareVariants({ visits: 1000, conversions: 100 }, { visits: 1000, conversions: 102 });
    expect(r.pValue).toBeGreaterThan(0.05);
    expect(r.isSignificant).toBe(false);
  });

  it("flags a warning when samples are too small (<100/variant)", () => {
    const r = compareVariants({ visits: 30, conversions: 5 }, { visits: 25, conversions: 7 });
    expect(r.warning).toMatch(/sample too small/i);
  });

  it("handles zero-visit edges without dividing by zero", () => {
    const r = compareVariants({ visits: 0, conversions: 0 }, { visits: 100, conversions: 10 });
    expect(r.control.rate).toBe(0);
    expect(r.treatment.rate).toBeCloseTo(0.1, 4);
    expect(r.isSignificant).toBe(false);
    expect(r.pValue).toBeCloseTo(1, 6);
    expect(Number.isFinite(r.zScore)).toBe(true);
  });

  it("handles identical rates (no winner) — z=0, p≈1", () => {
    const r = compareVariants({ visits: 500, conversions: 50 }, { visits: 500, conversions: 50 });
    expect(r.zScore).toBe(0);
    // A&S normal-CDF approximation is accurate to ~7.5e-8 — exact 1.0 isn't expected
    expect(r.pValue).toBeCloseTo(1, 6);
    expect(r.liftPct).toBe(0);
    expect(r.isSignificant).toBe(false);
  });

  it("identifies a clear loser (negative lift, significant)", () => {
    // Control 16%, Treatment 8% — treatment is clearly worse
    const r = compareVariants({ visits: 500, conversions: 80 }, { visits: 500, conversions: 40 });
    expect(r.liftPct).toBeLessThan(0);
    expect(r.pValue).toBeLessThan(0.05);
    expect(r.isSignificant).toBe(true);
  });

  it("CI width shrinks as sample size grows", () => {
    const small = compareVariants({ visits: 100, conversions: 10 }, { visits: 100, conversions: 12 });
    const large = compareVariants({ visits: 10000, conversions: 1000 }, { visits: 10000, conversions: 1200 });
    const smallWidth = small.ci95[1] - small.ci95[0];
    const largeWidth = large.ci95[1] - large.ci95[0];
    expect(largeWidth).toBeLessThan(smallWidth);
  });
});
