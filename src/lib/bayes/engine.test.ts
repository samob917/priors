import { describe, it, expect } from "vitest";
import {
  applyPointUpdate,
  likelihoodRatioFromStrength,
  dampenedFeedLR,
  applyBetaUpdate,
  betaMean,
  applyNormalUpdate,
  normalMean,
  distributionToPoint,
} from "./engine";

describe("applyPointUpdate", () => {
  it("updates a 50% prior with LR=2 to ~66.7%", () => {
    const result = applyPointUpdate(0.5, 2);
    expect(result).toBeCloseTo(0.6667, 3);
  });

  it("updates a 50% prior with LR=0.5 to ~33.3%", () => {
    const result = applyPointUpdate(0.5, 0.5);
    expect(result).toBeCloseTo(0.3333, 3);
  });

  it("LR=1 leaves the prior unchanged", () => {
    const result = applyPointUpdate(0.7, 1);
    expect(result).toBeCloseTo(0.7, 5);
  });

  it("clamps near-zero probabilities", () => {
    const result = applyPointUpdate(0.01, 0.01);
    expect(result).toBeGreaterThanOrEqual(0.001);
  });

  it("clamps near-one probabilities", () => {
    const result = applyPointUpdate(0.99, 100);
    expect(result).toBeLessThanOrEqual(0.999);
  });

  it("throws on non-positive LR", () => {
    expect(() => applyPointUpdate(0.5, 0)).toThrow();
    expect(() => applyPointUpdate(0.5, -1)).toThrow();
  });
});

describe("likelihoodRatioFromStrength", () => {
  it("maps 0 to LR=1 (neutral)", () => {
    expect(likelihoodRatioFromStrength(0)).toBeCloseTo(1, 5);
  });

  it("maps 1 to LR=10", () => {
    expect(likelihoodRatioFromStrength(1)).toBeCloseTo(10, 3);
  });

  it("maps -1 to LR=0.1", () => {
    expect(likelihoodRatioFromStrength(-1)).toBeCloseTo(0.1, 3);
  });

  it("clamps values outside [-1, 1]", () => {
    expect(likelihoodRatioFromStrength(5)).toBeCloseTo(10, 3);
    expect(likelihoodRatioFromStrength(-5)).toBeCloseTo(0.1, 3);
  });
});

describe("dampenedFeedLR", () => {
  it("returns 1 when external equals current (no update)", () => {
    const lr = dampenedFeedLR(0.5, 0.5);
    expect(lr).toBeCloseTo(1, 5);
  });

  it("returns LR > 1 when external > current", () => {
    const lr = dampenedFeedLR(0.3, 0.7);
    expect(lr).toBeGreaterThan(1);
  });

  it("dampens the raw LR", () => {
    const dampened = dampenedFeedLR(0.3, 0.7, 0.3);
    const undampened = dampenedFeedLR(0.3, 0.7, 1.0);
    // Dampened should be closer to 1 than undampened
    expect(Math.abs(dampened - 1)).toBeLessThan(Math.abs(undampened - 1));
  });
});

describe("Beta distribution", () => {
  it("updates alpha and beta with new observations", () => {
    const result = applyBetaUpdate({ alpha: 10, beta: 5 }, { successes: 3, failures: 2 });
    expect(result.alpha).toBe(13);
    expect(result.beta).toBe(7);
  });

  it("computes the mean correctly", () => {
    expect(betaMean({ alpha: 10, beta: 10 })).toBeCloseTo(0.5, 3);
    expect(betaMean({ alpha: 8, beta: 2 })).toBeCloseTo(0.8, 3);
  });

  it("throws on negative evidence", () => {
    expect(() => applyBetaUpdate({ alpha: 10, beta: 5 }, { successes: -1, failures: 0 })).toThrow();
  });
});

describe("Normal distribution", () => {
  it("updates toward observed mean", () => {
    const prior = { mean: 0.5, stddev: 0.1 };
    const evidence = { observedMean: 0.7, observedStddev: 0.1, sampleSize: 10 };
    const result = applyNormalUpdate(prior, evidence);
    expect(result.mean).toBeGreaterThan(0.5);
    expect(result.mean).toBeLessThan(0.7);
  });

  it("reduces stddev (more certainty) after update", () => {
    const prior = { mean: 0.5, stddev: 0.1 };
    const evidence = { observedMean: 0.5, observedStddev: 0.1, sampleSize: 5 };
    const result = applyNormalUpdate(prior, evidence);
    expect(result.stddev).toBeLessThan(prior.stddev);
  });

  it("weights toward larger sample sizes", () => {
    const prior = { mean: 0.5, stddev: 0.1 };
    const small = applyNormalUpdate(prior, { observedMean: 0.8, observedStddev: 0.1, sampleSize: 1 });
    const large = applyNormalUpdate(prior, { observedMean: 0.8, observedStddev: 0.1, sampleSize: 100 });
    // Large sample should pull mean closer to 0.8
    expect(large.mean).toBeGreaterThan(small.mean);
  });

  it("throws on invalid inputs", () => {
    expect(() =>
      applyNormalUpdate({ mean: 0.5, stddev: 0.1 }, { observedMean: 0.5, observedStddev: 0.1, sampleSize: 0 })
    ).toThrow();
    expect(() =>
      applyNormalUpdate({ mean: 0.5, stddev: 0.1 }, { observedMean: 0.5, observedStddev: -1, sampleSize: 5 })
    ).toThrow();
  });

  it("clamps normalMean to [0.001, 0.999]", () => {
    expect(normalMean({ mean: -5, stddev: 0.1 })).toBe(0.001);
    expect(normalMean({ mean: 5, stddev: 0.1 })).toBe(0.999);
  });
});

describe("distributionToPoint", () => {
  it("handles POINT type", () => {
    expect(distributionToPoint("POINT", { probability: 0.6 })).toBeCloseTo(0.6, 3);
  });

  it("handles BETA type", () => {
    expect(distributionToPoint("BETA", { alpha: 8, beta: 2 })).toBeCloseTo(0.8, 3);
  });

  it("handles NORMAL type", () => {
    expect(distributionToPoint("NORMAL", { mean: 0.7, stddev: 0.1 })).toBeCloseTo(0.7, 3);
  });
});
