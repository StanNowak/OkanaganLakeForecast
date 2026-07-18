import type { DayForecast } from '../lib/forecast'
import { formatDayLabel, formatScore } from '../lib/format'
import { scoreColor, scoreLabel } from '../lib/rating'
import { BestWindowBadge } from './BestWindowBadge'
import { ConfidenceBadge } from './ConfidenceBadge'

type Props = {
  day: DayForecast
  selected: boolean
  onSelect: () => void
}

function PeriodChip({
  label,
  score,
  confidence,
  pGlassy,
}: {
  label: string
  score: number
  confidence: number
  pGlassy: number
}) {
  return (
    <div className="rounded-lg bg-black/20 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 flex items-center gap-2">
        <span className="text-base font-semibold" style={{ color: scoreColor(score) }}>
          {formatScore(score)}
        </span>
        <span className="text-xs text-slate-400">{scoreLabel(score)}</span>
      </div>
      <div className="mt-1">
        <ConfidenceBadge confidence={confidence} pGlassy={pGlassy} compact />
      </div>
    </div>
  )
}

export function DayCard({ day, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-3 text-left transition ${
        selected
          ? 'border-sky-400/40 bg-sky-500/10'
          : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-100">{formatDayLabel(day.date)}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold" style={{ color: scoreColor(day.dayScore) }}>
              {formatScore(day.dayScore)}
            </span>
            <span className="text-sm text-slate-400">{scoreLabel(day.dayScore)}</span>
          </div>
        </div>
        <ConfidenceBadge confidence={day.dayConfidence} pGlassy={day.dayPGlassy} compact />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <PeriodChip
          label="Morning (worst hr)"
          score={day.morning.worstScore}
          confidence={day.morning.confidence}
          pGlassy={day.morning.pGlassy}
        />
        <PeriodChip
          label="Afternoon (worst hr)"
          score={day.afternoon.worstScore}
          confidence={day.afternoon.confidence}
          pGlassy={day.afternoon.pGlassy}
        />
      </div>

      <div className="mt-3">
        <BestWindowBadge window={day.bestWindow} />
      </div>
    </button>
  )
}
