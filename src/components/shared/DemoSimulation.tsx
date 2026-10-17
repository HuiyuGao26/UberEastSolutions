import { MessageSquareWarning } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/state/store'

/** The customer-side demo action lives below the merchant's tablet. */
export function DemoSimulation() {
  const { decisions, simulationTarget, simulateMissingItem } = useApp()
  const hint = simulationTarget
    ? `About order ${simulationTarget.order.id}`
    : decisions.some((decision) => decision.accepted) ? 'Accept another order first' : 'Accept an order first'

  return (
    <section aria-label="Customer simulation" className="mx-auto mt-3 flex w-[1000px] max-w-full flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/80 px-4 py-3">
      <div>
        <p className="text-xs font-medium">Customer report</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      <Button variant="secondary" disabled={!simulationTarget} onClick={simulateMissingItem}>
        <MessageSquareWarning /> Simulate: customer reports a missing item
      </Button>
    </section>
  )
}
