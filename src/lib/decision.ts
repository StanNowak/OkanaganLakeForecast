/** Plain-language go/no-go for glanceable UI. */
export type Decision = 'go' | 'maybe' | 'no'

export function goDecision(score: number, confidence: number, pGlassy: number): Decision {
  if (!Number.isFinite(score)) return 'maybe'
  if (score >= 75 && confidence >= 0.4 && pGlassy >= 0.45) return 'go'
  if (score >= 55 && confidence >= 0.3) return 'maybe'
  if (score >= 70 && confidence < 0.3) return 'maybe'
  return 'no'
}

export function decisionCopy(d: Decision): {
  title: string
  subtitle: string
  tone: 'go' | 'maybe' | 'skip'
} {
  switch (d) {
    case 'go':
      return {
        title: 'GO SKI',
        subtitle: 'Looks glassy enough',
        tone: 'go',
      }
    case 'maybe':
      return {
        title: 'MAYBE',
        subtitle: 'Could work — check the time',
        tone: 'maybe',
      }
    case 'no':
      return {
        title: 'SKIP',
        subtitle: 'Too windy / choppy',
        tone: 'skip',
      }
  }
}

export function plainScoreLabel(score: number): string {
  if (score >= 90) return 'Glassy'
  if (score >= 80) return 'Very good'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Fair'
  if (score >= 30) return 'Choppy'
  return 'Rough'
}

export function plainConfidence(c: number): string {
  if (c >= 0.75) return 'High confidence'
  if (c >= 0.5) return 'Medium confidence'
  if (c >= 0.3) return 'Low confidence'
  return 'Uncertain'
}
