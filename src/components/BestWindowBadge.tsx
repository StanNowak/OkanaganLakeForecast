import type { BestWindow } from '../lib/forecast'
import { formatHour, formatScore } from '../lib/format'
import { ConfidenceBadge } from './ConfidenceBadge'

type Props = {
  window: BestWindow
}

export function BestWindowBadge({ window }: Props) {
  if (!window) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400">
        No clear glassy window today
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-emerald-300/80">Best ski window</div>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
        <span className="text-lg font-semibold text-emerald-100">
          {formatHour(window.start)} – {formatHour(window.end)}
        </span>
        <span className="text-sm text-emerald-200/80">
          {window.hours}h · avg {formatScore(window.meanScore)}
        </span>
        <ConfidenceBadge confidence={window.confidence} compact />
      </div>
    </div>
  )
}
