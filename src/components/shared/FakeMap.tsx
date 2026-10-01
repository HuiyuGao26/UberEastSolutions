import { Bike, Home, Store } from 'lucide-react'

/** A schematic map: merchant top-left, customer bottom-right, courier along the route. */
export function FakeMap({ progress, label }: { progress: number; label?: string }) {
  const route = [
    [40, 40],
    [40, 120],
    [200, 120],
    [200, 190],
    [300, 190],
  ]
  const lengths = route.slice(1).map((p, i) => Math.hypot(p[0] - route[i][0], p[1] - route[i][1]))
  const total = lengths.reduce((a, b) => a + b, 0)
  let remaining = Math.min(Math.max(progress, 0), 1) * total
  let pos = route[0]
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]) {
      const t = remaining / lengths[i]
      pos = [route[i][0] + (route[i + 1][0] - route[i][0]) * t, route[i][1] + (route[i + 1][1] - route[i][1]) * t]
      break
    }
    remaining -= lengths[i]
    pos = route[i + 1]
  }

  return (
    <div className="relative overflow-hidden rounded-xl border bg-emerald-50/60">
      <svg viewBox="0 0 340 230" className="block h-auto w-full" role="img" aria-label="Schematic delivery map">
        {[30, 80, 130, 180].map((y) => (
          <line key={`h${y}`} x1="0" x2="340" y1={y + 10} y2={y + 10} stroke="white" strokeWidth="8" />
        ))}
        {[40, 120, 200, 280].map((x) => (
          <line key={`v${x}`} y1="0" y2="230" x1={x} x2={x} stroke="white" strokeWidth="8" />
        ))}
        <polyline
          points={route.map((p) => p.join(',')).join(' ')}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="4"
          strokeDasharray="6 5"
          strokeLinecap="round"
        />
      </svg>
      <Pin x={40} y={40} className="bg-zinc-900 text-white">
        <Store className="size-3.5" />
      </Pin>
      <Pin x={300} y={190} className="bg-white text-zinc-900 ring-2 ring-zinc-900">
        <Home className="size-3.5" />
      </Pin>
      <Pin x={pos[0]} y={pos[1]} className="bg-primary text-primary-foreground shadow-lg transition-all duration-700">
        <Bike className="size-3.5" />
      </Pin>
      {label && (
        <div className="absolute bottom-2 left-2 rounded-md bg-background/90 px-2 py-1 text-[11px] shadow-sm">{label}</div>
      )}
    </div>
  )
}

function Pin({ x, y, className, children }: { x: number; y: number; className: string; children: React.ReactNode }) {
  return (
    <div
      className={`absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full ${className}`}
      style={{ left: `${(x / 340) * 100}%`, top: `${(y / 230) * 100}%` }}
    >
      {children}
    </div>
  )
}
