import { useEffect, useState } from 'react'
import { webcams, type Webcam } from '../config/webcams'

function StillCam({ cam }: { cam: Webcam }) {
  const [src, setSrc] = useState(
    cam.imageUrl ? `${cam.imageUrl}?t=${Date.now()}` : '',
  )
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!cam.imageUrl) return
    const tick = () => setSrc(`${cam.imageUrl}?t=${Date.now()}`)
    tick()
    const id = window.setInterval(tick, cam.refreshMs ?? 60_000)
    return () => window.clearInterval(id)
  }, [cam.imageUrl, cam.refreshMs])

  if (!cam.imageUrl || failed) return null

  return (
    <img
      src={src}
      alt=""
      className="h-36 w-full object-cover"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

function WebcamCard({ cam }: { cam: Webcam }) {
  const hasStill = Boolean(cam.imageUrl)

  return (
    <a
      href={cam.href}
      target="_blank"
      rel="noopener noreferrer"
      className="block overflow-hidden rounded-2xl border-2 border-[var(--line)] bg-[var(--card)] transition hover:border-[var(--brass)]"
    >
      {hasStill ? <StillCam cam={cam} /> : null}
      <div
        className={`flex items-start justify-between gap-3 px-3 ${hasStill ? 'py-3' : 'py-2.5'}`}
      >
        <div className="min-w-0">
          <div className="text-lg font-extrabold text-[var(--ink)]">{cam.name}</div>
          <div className="mt-0.5 text-sm leading-snug text-[var(--muted)]">{cam.description}</div>
        </div>
        {!hasStill && (
          <span className="shrink-0 rounded-full bg-[var(--hull)] px-2.5 py-1 text-xs font-bold text-[var(--deck)]">
            Open →
          </span>
        )}
      </div>
    </a>
  )
}

export function WebcamGallery() {
  return (
    <section className="panel p-4">
      <h2 className="font-display text-4xl text-[var(--hull)]">Lake webcams</h2>
      <p className="mt-1 text-lg text-[var(--muted)]">
        Quick look at the water — sailing club, yacht club, and lake towers.
      </p>

      <ul className="mt-4 grid gap-2.5">
        {webcams.map((cam) => (
          <li key={cam.id}>
            <WebcamCard cam={cam} />
          </li>
        ))}
      </ul>
    </section>
  )
}
