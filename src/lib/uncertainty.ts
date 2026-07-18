import { skiThresholds } from '../config'

export type SampleStats = {
  mean: number
  std: number
  min: number
  max: number
  p25: number
  p75: number
  n: number
}

export type UncertaintyResult = {
  meanScore: number
  scoreStd: number
  pGlassy: number
  /** 0–1 confidence: high when scores agree and lead time is short */
  confidence: number
  stats: SampleStats
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  const a = sorted[base]!
  const b = sorted[Math.min(base + 1, sorted.length - 1)]!
  return a + rest * (b - a)
}

export function sampleStats(values: number[]): SampleStats {
  const clean = values.filter((v) => Number.isFinite(v))
  if (clean.length === 0) {
    return { mean: NaN, std: NaN, min: NaN, max: NaN, p25: NaN, p75: NaN, n: 0 }
  }
  const sorted = [...clean].sort((a, b) => a - b)
  const mean = clean.reduce((s, v) => s + v, 0) / clean.length
  const variance =
    clean.reduce((s, v) => s + (v - mean) * (v - mean), 0) /
    Math.max(1, clean.length - 1)
  return {
    mean,
    std: Math.sqrt(variance),
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    p25: quantile(sorted, 0.25),
    p75: quantile(sorted, 0.75),
    n: clean.length,
  }
}

/**
 * Confidence from score agreement + lead-time decay.
 * Spread of ~0 → ~1; spread of ~30 score points → ~0.3; lead days cut further.
 */
export function computeConfidence(
  scores: number[],
  leadHours: number,
): UncertaintyResult {
  const stats = sampleStats(scores)
  const glassy = skiThresholds.glassyScore
  const pGlassy =
    stats.n === 0
      ? 0
      : scores.filter((s) => Number.isFinite(s) && s >= glassy).length / stats.n

  // Agreement: map std of scores (0–50 typical) onto 0–1
  const agreement = Number.isFinite(stats.std)
    ? Math.exp(-stats.std / 18)
    : 0

  // Lead-time penalty: full weight near now, ~0.55 at day 5
  const leadDays = Math.max(0, leadHours) / 24
  const leadFactor = Math.exp(-0.12 * leadDays)

  // Small-sample discount
  const nFactor = Math.min(1, stats.n / 8)

  const confidence = Math.max(0, Math.min(1, agreement * leadFactor * nFactor))

  return {
    meanScore: stats.mean,
    scoreStd: stats.std,
    pGlassy,
    confidence,
    stats,
  }
}

export function confidenceLabel(c: number): string {
  if (c >= 0.75) return 'High'
  if (c >= 0.5) return 'Moderate'
  if (c >= 0.3) return 'Low'
  return 'Very low'
}
