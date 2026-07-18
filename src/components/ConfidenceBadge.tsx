import { confidenceLabel } from '../lib/uncertainty'
import { formatPct } from '../lib/format'

type Props = {
  confidence: number
  pGlassy?: number
  compact?: boolean
}

export function ConfidenceBadge({ confidence, pGlassy, compact }: Props) {
  const label = confidenceLabel(confidence)
  const tone =
    confidence >= 0.75
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : confidence >= 0.5
        ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
        : confidence >= 0.3
          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}
      title={`Model agreement / lead-time confidence: ${formatPct(confidence)}`}
    >
      <span className="opacity-70">{compact ? 'Conf' : 'Confidence'}</span>
      <span>{label}</span>
      {!compact && <span className="opacity-60">{formatPct(confidence)}</span>}
      {pGlassy != null && Number.isFinite(pGlassy) && (
        <span className="border-l border-white/15 pl-1.5 opacity-90">
          P(glass) {formatPct(pGlassy)}
        </span>
      )}
    </span>
  )
}
