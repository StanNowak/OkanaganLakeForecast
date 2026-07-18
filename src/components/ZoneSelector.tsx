import type { Zone } from '../config'

type Props = {
  zones: Zone[]
  selectedId: string
  onChange: (id: string) => void
}

export function ZoneSelector({ zones, selectedId, onChange }: Props) {
  return (
    <div className="grid gap-2.5" role="radiogroup" aria-label="Ski location">
      {zones.map((z) => {
        const active = z.id === selectedId
        return (
          <button
            key={z.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(z.id)}
            className={`min-h-16 rounded-2xl border-2 px-4 py-3.5 text-left transition ${
              active
                ? 'border-[var(--brass)] bg-[var(--hull)] text-[var(--deck)] shadow-md'
                : 'border-[var(--line)] bg-[var(--card)] text-[var(--ink)]'
            }`}
          >
            <div className="text-xl font-extrabold">{z.name}</div>
            <div
              className={`mt-0.5 text-base leading-snug ${
                active ? 'text-[var(--brass-bright)]' : 'text-[var(--muted)]'
              }`}
            >
              {z.description}
            </div>
          </button>
        )
      })}
    </div>
  )
}
