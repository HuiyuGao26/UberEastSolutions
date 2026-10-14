import { Database, FlaskConical, MessageSquareWarning, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { Source } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useApp } from '@/state/store'
import { DataSheet } from './DataSheet'

const SOURCES: { id: Source; label: string; icon: typeof Database }[] = [
  { id: 'sample', label: 'Sample data', icon: FlaskConical },
  { id: 'sap', label: 'SAP sandbox', icon: Database },
]

export function TopBar() {
  const { source, setSource, reset, decisions, simulationTarget, simulateMissingItem } = useApp()
  // Which order the simulation is about, or why it cannot run right now.
  const simulationHint = simulationTarget
    ? `About order ${simulationTarget.order.id}`
    : source === 'sap'
      ? 'Sample data only: the sandbox cannot be written to'
      : decisions.some((d) => d.accepted)
        ? 'Accept another order first'
        : 'Accept an order first'

  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b bg-background px-4 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">OC</span>
          <span className="font-semibold">Order Care</span>
          <span className="text-sm text-muted-foreground">merchant app prototype for Uber Eats NZ</span>
        </div>
        <p className="text-[11px] text-muted-foreground">INFOSYS 704 group prototype · not affiliated with Uber</p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Data source</span>
        <nav className="flex rounded-lg bg-muted p-1" aria-label="Data source">
          {SOURCES.map((s) => {
            const Icon = s.icon
            const active = source === s.id
            return (
              <button
                key={s.id}
                onClick={() => setSource(s.id)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                  active ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
                aria-pressed={active}
              >
                <Icon className="size-4" />
                {s.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="flex flex-col items-start gap-0.5">
        <Button variant="outline" size="sm" disabled={!simulationTarget} onClick={simulateMissingItem}>
          <MessageSquareWarning /> Simulate: customer reports a missing item
        </Button>
        <span className="pl-1 text-[11px] leading-tight text-muted-foreground">{simulationHint}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <DataSheet />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            reset()
            toast('Reset: every order is a new offer again')
          }}
        >
          <RotateCcw /> Reset
        </Button>
      </div>
    </header>
  )
}
