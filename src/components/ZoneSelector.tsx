import type { Zone } from '../config'

type Props = {
  zones: Zone[]
  selectedId: string
  onChange: (id: string) => void
}

export function ZoneSelector({ zones, selectedId, onChange }: Props) {
  const selected = zones.find((z) => z.id === selectedId) ?? zones[0]

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
        Ski spot
      </span>
      <div className="relative">
        <select
          value={selectedId}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-12 w-full appearance-none rounded-xl border-2 border-[var(--line)] bg-[var(--card)] px-4 py-3 pr-10 text-lg font-extrabold text-[var(--ink)] shadow-sm"
          aria-label="Ski location"
        >
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--hull)]"
          aria-hidden
        >
          ▾
        </span>
      </div>
      {selected && (
        <p className="mt-1.5 text-sm text-[var(--muted)]">{selected.description}</p>
      )}
    </label>
  )
}
