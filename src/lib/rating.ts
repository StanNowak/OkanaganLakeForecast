import { skiThresholds } from '../config'
import type { WaveState } from './waveModel'

export type RatingBreakdown = {
  score: number
  waveTerm: number
  windTerm: number
  gustTerm: number
  whitecapTerm: number
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

/** Smooth linear ramp from 1 at `ok` down to 0 at `zero`. */
function rampDown(value: number, ok: number, zero: number): number {
  if (value <= ok) return 1
  if (value >= zero) return 0
  return 1 - (value - ok) / (zero - ok)
}

/**
 * Water-ski score 0–100. High = glassy. Hs dominates; wind/gust/whitecap penalize.
 */
export function skiScore(
  windKn: number,
  gustKn: number | null | undefined,
  waves: WaveState,
  thresholds = skiThresholds,
): RatingBreakdown {
  const waveTerm = clamp01(
    1 - Math.pow(waves.hsM / thresholds.waveHeightRefM, thresholds.waveExponent),
  )

  const windTerm = rampDown(windKn, thresholds.calmMaxKn, thresholds.windZeroKn)

  const gust = gustKn ?? windKn
  const spread = Math.max(0, gust - windKn)
  const gustTerm = rampDown(spread, thresholds.gustSpreadOkKn, thresholds.gustSpreadZeroKn)

  // Hard penalty once whitecaps onset; residual coverage still hurts
  let whitecapTerm = 1
  if (waves.whitecaps || windKn >= thresholds.whitecapOnsetKn) {
    whitecapTerm = clamp01(0.25 * (1 - waves.whitecapFraction * 4))
  }

  const score = 100 * waveTerm * windTerm * gustTerm * whitecapTerm

  return {
    score,
    waveTerm,
    windTerm,
    gustTerm,
    whitecapTerm,
  }
}

export function scoreLabel(score: number): string {
  if (score >= 90) return 'Glassy'
  if (score >= 80) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Marginal'
  if (score >= 30) return 'Choppy'
  return 'Whitecaps'
}

export function scoreColor(score: number): string {
  // Nautique-readable tones on cream deck backgrounds
  if (score >= 80) return '#1f6b4a'
  if (score >= 70) return '#3d6b7a'
  if (score >= 50) return '#c4892a'
  if (score >= 30) return '#b45309'
  return '#c8102e'
}
