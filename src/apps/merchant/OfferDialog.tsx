import { Info } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ProposalTag } from '@/components/shared/ProposalTag'
import { clockTime, money, percent, signedMoney } from '@/domain/format'
import type { Order } from '@/domain/types'
import { offerBreakdown } from '@/state/selectors'
import { useDemo, useDispatch } from '@/state/store'

/** Release 1 of Gao's proposal: the expected net payout and fee basis on the order offer. */
export function OfferDialog({ order }: { order: Order }) {
  const s = useDemo()
  const dispatch = useDispatch()
  const b = offerBreakdown(s, order)

  return (
    <Dialog open>
      <DialogContent showCloseButton={false} className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>New order {order.id}</DialogTitle>
            <ProposalTag id="huiyu" />
          </div>
          <DialogDescription>
            {order.customerName} · {order.customerSuburb} · placed {clockTime(order.placedAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 text-sm">
          {order.items.map((item) => (
            <div key={item.name} className="flex justify-between">
              <span>
                {item.qty} × {item.name}
                {item.merchantDiscount ? <span className="ml-1.5 text-xs text-amber-700">your promo −{percent(item.merchantDiscount)}</span> : null}
              </span>
              <span className="font-mono">{money(item.qty * item.unitPrice)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1 rounded-lg bg-muted/60 p-3 text-sm">
          <Row label="Items at menu price" value={money(b.listTotal)} />
          {b.promo > 0 && <Row label="Your promotion" value={signedMoney(-b.promo)} />}
          <Row label="Fee basis (what the customer pays for items)" value={money(b.feeBasis)} muted />
          <Row label={`Uber Eats fee, ${percent(b.feeRate)} of the fee basis`} value={signedMoney(-b.fee)} />
          <Separator className="my-1.5" />
          <div className="flex items-baseline justify-between">
            <span className="font-medium">Expected payout for this order</span>
            <span className="text-2xl font-semibold">{money(b.net)}</span>
          </div>
        </div>

        <p className="flex gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Shown before you accept. The fee rate is illustrative. With your own promotion, the fee is worked out on the discounted price.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => dispatch({ type: 'order/decline', orderId: order.id })}>
            Decline
          </Button>
          <Button
            onClick={() => {
              dispatch({ type: 'order/accept', orderId: order.id })
              toast.success(`Accepted ${order.id}: expected payout ${money(b.net)}`)
            }}
          >
            Accept order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? 'text-muted-foreground' : ''}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}
