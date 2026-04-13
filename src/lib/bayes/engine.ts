import type { BetaParams, NormalParams, BetaEvidence, NormalEvidence } from "./types";

const MIN_PROBABILITY = 0.001;
const MAX_PROBABILITY = 0.999;

function clamp(p: number): number {
  return Math.min(MAX_PROBABILITY, Math.max(MIN_PROBABILITY, p));
}

/**
 * Convert probability to odds: p / (1 - p)
 */
function toOdds(p: number): number {
  const clamped = clamp(p);
  return clamped / (1 - clamped);
}

/**
 * Convert odds back to probability: odds / (1 + odds)
 */
function fromOdds(odds: number): number {
  return clamp(odds / (1 + odds));
}

// ── Point estimate updates ────────────────────────────────────

/**
 * Apply a Bayesian update using a likelihood ratio.
 * LR > 1 means evidence supports the claim, LR < 1 means evidence against.
 */
export function applyPointUpdate(prior: number, likelihoodRatio: number): number {
  if (likelihoodRatio <= 0) throw new Error("Likelihood ratio must be positive");
  const posteriorOdds = toOdds(prior) * likelihoodRatio;
  return fromOdds(posteriorOdds);
}

/**
 * Map a "strength" slider value (-1 to 1) to a likelihood ratio.
 * -1 = strong evidence against (LR ≈ 0.1)
 *  0 = neutral (LR = 1)
 *  1 = strong evidence for (LR ≈ 10)
 *
 * Uses exponential mapping: LR = 10^strength
 */
export function likelihoodRatioFromStrength(strength: number): number {
  const clamped = Math.min(1, Math.max(-1, strength));
  return Math.pow(10, clamped);
}

/**
 * Compute a dampened likelihood ratio for data feed updates.
 * Pulls the prior toward the external value but doesn't fully override.
 */
export function dampenedFeedLR(
  currentProbability: number,
  externalValue: number,
  dampingFactor: number = 0.3
): number {
  const currentOdds = toOdds(currentProbability);
  const externalOdds = toOdds(externalValue);
  const rawLR = externalOdds / currentOdds;
  return Math.pow(rawLR, dampingFactor);
}

// ── Beta distribution updates ─────────────────────────────────

/**
 * Update a Beta distribution with new observations (conjugate update).
 */
export function applyBetaUpdate(params: BetaParams, evidence: BetaEvidence): BetaParams {
  if (evidence.successes < 0 || evidence.failures < 0) {
    throw new Error("Evidence counts must be non-negative");
  }
  return {
    alpha: params.alpha + evidence.successes,
    beta: params.beta + evidence.failures,
  };
}

/**
 * Get the mean (point estimate) of a Beta distribution.
 */
export function betaMean(params: BetaParams): number {
  return clamp(params.alpha / (params.alpha + params.beta));
}

// ── Normal distribution updates ───────────────────────────────

/**
 * Update a Normal distribution using precision-weighted averaging (conjugate update).
 * Treats the prior as N(mean, stddev^2) and incorporates new observations.
 */
export function applyNormalUpdate(params: NormalParams, evidence: NormalEvidence): NormalParams {
  if (evidence.sampleSize <= 0) throw new Error("Sample size must be positive");
  if (evidence.observedStddev <= 0) throw new Error("Observed stddev must be positive");

  const priorPrecision = 1 / (params.stddev * params.stddev);
  const likelihoodPrecision = evidence.sampleSize / (evidence.observedStddev * evidence.observedStddev);

  const posteriorPrecision = priorPrecision + likelihoodPrecision;
  const posteriorMean =
    (priorPrecision * params.mean + likelihoodPrecision * evidence.observedMean) / posteriorPrecision;
  const posteriorStddev = Math.sqrt(1 / posteriorPrecision);

  return {
    mean: posteriorMean,
    stddev: posteriorStddev,
  };
}

/**
 * Get the point estimate from a Normal distribution (the mean, clamped to [0,1]).
 */
export function normalMean(params: NormalParams): number {
  return clamp(params.mean);
}

// ── Utility ───────────────────────────────────────────────────

/**
 * Convert any distribution to a point probability estimate.
 */
export function distributionToPoint(
  type: "POINT" | "BETA" | "NORMAL",
  params: Record<string, number>
): number {
  switch (type) {
    case "POINT":
      return clamp(params.probability ?? 0.5);
    case "BETA":
      return betaMean(params as unknown as BetaParams);
    case "NORMAL":
      return normalMean(params as unknown as NormalParams);
    default:
      throw new Error(`Unknown distribution type: ${type}`);
  }
}
