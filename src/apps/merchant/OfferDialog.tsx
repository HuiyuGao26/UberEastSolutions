import { BellRing, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { DeviceModal } from '@/components/shared/DeviceFrame'
import { ProposalTag } from '@/components/shared/ProposalTag'
import { clockTime, itemCount, money, percent, signedMoney } from '@/domain/format'
import type { Order } from '@/domain/types'
import { offerBreakdown } from '@/state/selectors'
import { useDemo, useDispatch } from '@/state/store'

/**
 * The incoming order offer on the merchant tablet. Release 1 of Gao's
 * proposal: the expected net payout and fee basis are shown before accepting.
 */
export function OfferDialog({ order }: { order: Order }) {
  const s = useDemo()
  const dispatch = useDispatch()
  const b = offerBreakdown(s, order)

  return (
    <DeviceModal labelledBy="offer-title" className="max-w-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 bg-zinc-900 px-5 py-3 text-white">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
          </span>
          <BellRing className="size-4" />
          <h2 id="offer-title" className="font-semibold">New order {order.id}</h2>
        </div>
        <span className="text-xs text-zinc-300">
          {order.customerName} · {order.customerSuburb} · {clockTime(order.placedAt)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-5 p-5">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{itemCount(order)} items</p>
          {order.items.map((item) => (
            <div key={item.name} className="flex justify-between gap-2 text-sm">
              <span>
                <span className="font-semibold">{item.qty} ×</span> {item.name}
                {item.merchantDiscount ? (
                  <span className="mt-0.5 block text-xs text-amber-700">Your promo: −{percent(item.merchantDiscount)}</span>
                ) : null}
              </span>
              <span className="font-mono">{money(item.qty * item.unitPrice)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1 rounded-xl bg-muted/70 p-4 text-sm">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">What you’ll get</span>
            <ProposalTag id="huiyu" />
          </div>
          <Row label="Items at menu price" value={money(b.listTotal)} />
          {b.promo > 0 && <Row label="Your promotion" value={signedMoney(-b.promo)} />}
          <Row label="Fee basis (what the customer pays)" value={money(b.feeBasis)} muted />
          <Row label={`Uber Eats fee, ${percent(b.feeRate)}`} value={signedMoney(-b.fee)} />
          <Separator className="my-2" />
          <div className="flex items-baseline justify-between">
            <span className="font-medium">Expected payout</span>
            <span className="text-3xl font-semibold text-primary">{money(b.net)}</span>
          </div>
        </div>
      </div>

      <p className="flex gap-1.5 px-5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Shown before you accept. The fee rate is illustrative. With your own promotion, the fee is worked out on the discounted price.
      </p>

      <div className="mt-4 grid grid-cols-[1fr_2fr] gap-3 border-t bg-muted/30 p-4">
        <Button variant="outline" size="lg" className="h-12 text-base" onClick={() => dispatch({ type: 'order/decline', orderId: order.id })}>
          Decline
        </Button>
        <Button
          size="lg"
          className="h-12 text-base"
          autoFocus
          onClick={() => {
            dispatch({ type: 'order/accept', orderId: order.id })
            toast.success(`Accepted ${order.id}: expected payout ${money(b.net)}`)
          }}
        >
          Accept order · {money(b.net)}
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
