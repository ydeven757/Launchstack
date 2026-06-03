/**
 * Two-proportion z-test for A/B significance.
 *
 * Given two variants (control + treatment) each with visits + conversions,
 * computes the z-score, two-tailed p-value, observed lift, and a 95%
 * confidence interval on the lift.
 *
 * Notes for operators:
 * - Needs ≥ 100 visits per variant for stable results — small samples
 *   inflate the false-positive rate.
 * - "Significant" here means p < 0.05 (two-tailed). For conservative
 *   decisions, hold out until p < 0.01.
 * - Lift = (treatmentRate - controlRate) / controlRate. Positive = winner.
 */

export type ABComparison = {
  control: { visits: number; conversions: number; rate: number };
  treatment: { visits: number; conversions: number; rate: number };
  liftPct: number;        // (treatmentRate - controlRate) / controlRate, as decimal
  zScore: number;
  pValue: number;
  isSignificant: boolean; // p < 0.05
  ci95: [number, number]; // 95% CI on the absolute rate diff
  warning?: string;
};

/** Standard-normal CDF via Abramowitz & Stegun 26.2.17 — accurate to ~7.5e-8 */
function normalCdf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1 / (1 + 0.2316419 * absX);
  const d = 0.3989422804014327 * Math.exp(-0.5 * absX * absX);
  const probLower = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return sign === 1 ? 1 - probLower : probLower;
}

export function compareVariants(
  control: { visits: number; conversions: number },
  treatment: { visits: number; conversions: number },
): ABComparison {
  const cVisits = Math.max(0, control.visits);
  const tVisits = Math.max(0, treatment.visits);
  const cConv = Math.max(0, Math.min(control.conversions, cVisits));
  const tConv = Math.max(0, Math.min(treatment.conversions, tVisits));

  const cRate = cVisits === 0 ? 0 : cConv / cVisits;
  const tRate = tVisits === 0 ? 0 : tConv / tVisits;

  let warning: string | undefined;
  if (cVisits < 100 || tVisits < 100) warning = "Sample too small (<100/variant) — treat p-value with caution";

  // Pooled standard error for the two-proportion z-test
  const totalConv = cConv + tConv;
  const totalVisits = cVisits + tVisits;
  const pooledRate = totalVisits === 0 ? 0 : totalConv / totalVisits;
  const se = totalVisits === 0 || pooledRate === 0 || pooledRate === 1
    ? 0
    : Math.sqrt(pooledRate * (1 - pooledRate) * (1 / cVisits + 1 / tVisits));

  const diff = tRate - cRate;
  const zScore = se === 0 ? 0 : diff / se;
  const pValue = se === 0 ? 1 : 2 * (1 - normalCdf(Math.abs(zScore)));

  // 95% CI on the absolute difference uses the *unpooled* SE
  const seUnpooled = cVisits === 0 || tVisits === 0
    ? 0
    : Math.sqrt(cRate * (1 - cRate) / cVisits + tRate * (1 - tRate) / tVisits);
  const ciHalf = 1.96 * seUnpooled;
  const ci95: [number, number] = [diff - ciHalf, diff + ciHalf];

  const liftPct = cRate === 0 ? 0 : (tRate - cRate) / cRate;

  return {
    control: { visits: cVisits, conversions: cConv, rate: cRate },
    treatment: { visits: tVisits, conversions: tConv, rate: tRate },
    liftPct,
    zScore,
    pValue,
    isSignificant: pValue < 0.05 && totalVisits > 0,
    ci95,
    warning,
  };
}
