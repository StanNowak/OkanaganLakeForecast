import { decisionCopy, goDecision, plainScoreLabel } from '../lib/decision'
import type { DayForecast } from '../lib/forecast'
import { formatScore } from '../lib/format'
import { scoreColor } from '../lib/rating'

type Props = {
  day: DayForecast
}

function Tile({
  title,
  score,
  confidence,
  pGlassy,
}: {
  title: string
  score: number
  confidence: number
  pGlassy: number
}) {
  const d = goDecision(score, confidence, pGlassy)
  const copy = decisionCopy(d)
  const pill =
    copy.tone === 'go'
      ? 'decision-go text-white'
      : copy.tone === 'maybe'
        ? 'decision-maybe'
        : 'decision-skip text-white'

  return (
    <div className="panel p-4">
      <div className="text-base font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
        {title}
      </div>
      <div
        className="font-display mt-2 text-5xl leading-none"
        style={{ color: scoreColor(score) }}
      >
        {formatScore(score)}
      </div>
      <div className="mt-1 text-xl font-extrabold text-[var(--ink)]">
        {plainScoreLabel(score)}
      </div>
      <div className={`mt-3 inline-block rounded-full px-3 py-1.5 text-sm font-extrabold ${pill}`}>
        {copy.title}
      </div>
    </div>
  )
}

export function PeriodTiles({ day }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Tile
        title="Morning"
        score={day.morning.worstScore}
        confidence={day.morning.confidence}
        pGlassy={day.morning.pGlassy}
      />
      <Tile
        title="Afternoon"
        score={day.afternoon.worstScore}
        confidence={day.afternoon.confidence}
        pGlassy={day.afternoon.pGlassy}
      />
    </div>
  )
}
