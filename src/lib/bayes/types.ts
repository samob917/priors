export interface BetaParams {
  alpha: number;
  beta: number;
}

export interface NormalParams {
  mean: number;
  stddev: number;
}

export interface BetaEvidence {
  successes: number;
  failures: number;
}

export interface NormalEvidence {
  observedMean: number;
  observedStddev: number;
  sampleSize: number;
}

export type DistributionParams = BetaParams | NormalParams;
