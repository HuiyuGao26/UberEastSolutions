import { useEffect, useState } from 'react'
import { BellRing, Info, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { DeviceModal } from '@/components/shared/DeviceFrame'
import { dayAndTime, itemCount, money, percent, signedMoney } from '@/domain/format'
import { withPricing } from '@/domain/mapping'
import { payoutBreakdown } from '@/domain/rules'
import type { Order } from '@/domain/types'
import { useApp } from '@/state/store'

type Pricing = 'loading' | 'ready' | 'unavailable'

/**
 * Reads the pricing elements of each line, which split it into menu price
 * and merchant promotion. The expected payout does not depend on them, so
 * the offer is usable while they load or if they cannot be read.
 */
function usePricedOrder(order: Order): { order: Order; pricing: Pricing } {
  const { repository } = useApp()
  const [result, setResult] = useState<{ id: string; order: Order; ok: boolean } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all(
      order.lines.map(async (line) => withPricing(line, await repository.listItemPricingElements(order.id, line.id, controller.signal))),
    )
      .then((lines) => setResult({ id: order.id, order: { ...order, lines }, ok: true }))
      .catch(() => {
        if (!controller.signal.aborted) setResult({ id: order.id, order, ok: false })
      })
    return () => controller.abort()
  }, [order, repository])

  if (result?.id !== order.id) return { order, pricing: 'loading' }
  return { order: result.order, pricing: result.ok ? 'ready' : 'unavailable' }
}

/**
 * An order offer on the merchant tablet. Release 1 of Gao's proposal: the
 * expected net payout and the fee basis are shown before accepting.
 */
export function OfferDialog({ order: offer, onClose }: { order: Order; onClose: () => void }) {
  const { decide, setScreen } = useApp()
  const { order, pricing } = usePricedOrder(offer)
  const b = payoutBreakdown(order)
  const cur = order.currency

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <DeviceModal labelledBy="offer-title" className="max-w-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 bg-zinc-900 px-5 py-3 text-white">
        <div className="flex items-center gap-2">
          <BellRing className="size-4" />
          <h2 id="offer-title" className="font-semibold">Order {order.id}</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-300">
            {order.customer} · placed {dayAndTime(order.placedAt)}
          </span>
          <button onClick={onClose} aria-label="Close without answering" className="rounded-md p-1 text-zinc-300 hover:bg-white/10 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 p-5">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{itemCount(order)} items</p>
          {order.lines.map((line) => (
            <div key={line.id} className="flex justify-between gap-2 text-sm">
              <span>
                <span className="font-semibold">{line.qty} ×</span> {line.name}
                {line.promoAmount > 0 && (
                  <span className="mt-0.5 block text-xs text-amber-700">Your promotion: {signedMoney(-line.promoAmount, cur)}</span>
                )}
              </span>
              <span className="font-mono">{money(line.listAmount, cur)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1 rounded-xl bg-muted/70 p-4 text-sm">
          <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">What you’ll get</p>
          {pricing === 'ready' && (
            <>
              <Row label="Items at menu price" value={money(b.listTotal, cur)} />
              {b.promo > 0 && <Row label="Your promotion" value={signedMoney(-b.promo, cur)} />}
            </>
          )}
          {pricing === 'loading' && <p className="text-xs text-muted-foreground">Reading prices and promotions…</p>}
          <Row label="Fee basis (what the customer pays for items)" value={money(b.feeBasis, cur)} muted={pricing === 'ready'} />
          <Row label={`Uber Eats fee, ${percent(b.feeRate)}`} value={signedMoney(-b.fee, cur)} />
          <Separator className="my-2" />
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="font-medium whitespace-nowrap">Expected payout</span>
            <span className="ml-auto text-3xl font-semibold whitespace-nowrap text-primary">{money(b.net, cur)}</span>
          </div>
        </div>
      </div>

      <p className="flex gap-1.5 px-5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Shown before you accept. The fee rate is illustrative. With your own promotion, the fee is worked out on the discounted price.
          {pricing === 'unavailable' && ' The split into menu price and promotion could not be read; the payout is unaffected.'}
        </span>
      </p>

      <div className="mt-4 grid grid-cols-[1fr_2fr] gap-3 border-t bg-muted/30 p-4">
        <Button
          variant="outline"
          size="lg"
          className="h-12 text-base"
          onClick={() => {
            decide(order, false, b)
            toast(`Declined order ${order.id}`)
            onClose()
          }}
        >
          Decline
        </Button>
        <Button
          size="lg"
          className="h-12 text-base"
          autoFocus
          onClick={() => {
            decide(order, true, b)
            toast.success(`Accepted order ${order.id}: expected payout ${money(b.net, cur)}`, {
              action: { label: 'View accepted', onClick: () => setScreen('decided') },
            })
            onClose()
          }}
        >
          Accept order · {money(b.net, cur)}
        </Button>
      </div>
    </DeviceModal>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${muted ? 'text-muted-foreground' : ''}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}
