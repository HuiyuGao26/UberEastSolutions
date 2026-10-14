import { useState } from 'react'
import { ClipboardCheck, Inbox, RefreshCw, TriangleAlert, Wallet } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TabletFrame } from '@/components/shared/DeviceFrame'
import { dayAndTime, itemCount, money, percent, signedMoney } from '@/domain/format'
import { acceptanceFor, canChallenge, payoutBreakdown } from '@/domain/rules'
import type { Order, Screen } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useApp, useOffers } from '@/state/store'
import { OfferDialog } from './OfferDialog'
import { PayoutsScreen } from './PayoutsScreen'

const NAV: { id: Screen; label: string; icon: typeof Inbox }[] = [
  { id: 'offers', label: 'New orders', icon: Inbox },
  { id: 'decided', label: 'Accepted', icon: ClipboardCheck },
  { id: 'payouts', label: 'Payouts', icon: Wallet },
]

export function MerchantApp() {
  const { screen, setScreen, repository, decisions, deductions, challenges } = useApp()
  const offers = useOffers()
  const [openOrderId, setOpenOrderId] = useState<string | null>(null)
  const openOffer = offers.find((o) => o.id === openOrderId)
  // Deductions the merchant can still act on.
  const openDeductions =
    deductions.status === 'ready'
      ? deductions.value.filter((d) => canChallenge(d, acceptanceFor(d, decisions)?.order) && !challenges.some((c) => c.deductionId === d.id))
          .length
      : 0
  const counts: Record<Screen, number> = {
    offers: offers.length,
    decided: decisions.filter((d) => d.accepted).length,
    payouts: openDeductions,
  }

  return (
    <TabletFrame>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-44 shrink-0 flex-col gap-1 border-r bg-muted/40 p-3">
          <div className="mb-3 px-2">
            <p className="font-semibold leading-tight">{repository.merchant.name}</p>
            <p className="text-xs text-muted-foreground">{repository.merchant.detail}</p>
          </div>
          {NAV.map((n) => {
            const Icon = n.icon
            return (
              <button
                key={n.id}
                onClick={() => setScreen(n.id)}
                aria-current={screen === n.id ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-2 text-sm',
                  screen === n.id ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:bg-background/60',
                )}
              >
                <Icon className="size-4" />
                <span className="flex-1 text-left">{n.label}</span>
                {counts[n.id] > 0 && (
                  <Badge variant={n.id === 'decided' ? 'secondary' : n.id === 'payouts' ? 'destructive' : 'default'} className="h-5 min-w-5 px-1.5">
                    {counts[n.id]}
                  </Badge>
                )}
              </button>
            )
          })}
          <p className="mt-auto px-2 text-[11px] text-muted-foreground">Merchant tablet</p>
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto p-5">
          {screen === 'offers' && <OffersScreen offers={offers} onOpen={setOpenOrderId} />}
          {screen === 'decided' && <DecidedScreen />}
          {screen === 'payouts' && <PayoutsScreen />}
        </main>
      </div>
      {openOffer && <OfferDialog order={openOffer} onClose={() => setOpenOrderId(null)} />}
    </TabletFrame>
  )
}

function OffersScreen({ offers, onOpen }: { offers: Order[]; onOpen: (orderId: string) => void }) {
  const { orders, source, setSource, reload, decisions } = useApp()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">New orders</h2>
        <p className="text-sm text-muted-foreground">Each order shows what it will pay you before you accept it.</p>
        {source === 'sap' && (
          <p className="mt-1 text-xs text-muted-foreground">
            Read live from the SAP sandbox. These are SAP’s own demo orders, shown through the same screen as the sample data.
          </p>
        )}
      </div>

      {orders.status === 'loading' && (
        <div className="grid grid-cols-2 gap-3" role="status" aria-label="Loading orders">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />
          ))}
          <p className="col-span-2 text-sm text-muted-foreground">
            {source === 'sap' ? 'Reading sales orders from the SAP sandbox…' : 'Loading orders…'}
          </p>
        </div>
      )}

      {orders.status === 'error' && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>The orders could not be loaded</AlertTitle>
          <AlertDescription>
            <p>{orders.message}</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={reload}>
                <RefreshCw /> Try again
              </Button>
              {source === 'sap' && (
                <Button size="sm" variant="outline" onClick={() => setSource('sample')}>
                  Use sample data
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {orders.status === 'ready' && offers.length === 0 && (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {decisions.length > 0
            ? 'No new orders. You have answered every offer; the accepted ones are under “Accepted”.'
            : 'No new orders right now.'}
        </p>
      )}

      {orders.status === 'ready' && offers.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {offers.map((order) => (
            <OfferCard key={order.id} order={order} onOpen={() => onOpen(order.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function OfferCard({ order, onOpen }: { order: Order; onOpen: () => void }) {
  const b = payoutBreakdown(order)
  const shownLines = order.lines.slice(0, 2)
  const hidden = order.lines.length - shownLines.length
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Order {order.id}</CardTitle>
        <CardDescription>
          {order.customer} · placed {dayAndTime(order.placedAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <ul className="text-sm">
          {shownLines.map((line) => (
            <li key={line.id} className="truncate">
              <span className="font-medium">{line.qty} ×</span> {line.name}
            </li>
          ))}
          {hidden > 0 && <li className="text-muted-foreground">+ {hidden} more</li>}
        </ul>
        <div className="mt-auto flex items-end justify-between gap-2 rounded-lg bg-primary/5 px-3 py-2">
          <div>
            <p className="text-xs text-muted-foreground">Expected payout</p>
            <p className="text-2xl font-semibold text-primary">{money(b.net, order.currency)}</p>
          </div>
          <p className="text-right text-[11px] leading-tight text-muted-foreground">
            after the {percent(b.feeRate)} fee
            <br />
            on {money(b.feeBasis, order.currency)}
          </p>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={onOpen}>Review offer</Button>
      </CardFooter>
    </Card>
  )
}

function DecidedScreen() {
  const { decisions, deductions, setScreen } = useApp()
  const deducted = (orderId: string) =>
    deductions.status === 'ready'
      ? deductions.value.filter((d) => d.reference.kind === 'order' && d.reference.id === orderId).reduce((sum, d) => sum + d.amount, 0)
      : 0
  const accepted = decisions.filter((d) => d.accepted)
  const currency = decisions[0]?.order.currency
  const expected = accepted.reduce((sum, d) => sum + d.shown.net, 0)
  const totalDeducted = accepted.reduce((sum, d) => sum + deducted(d.order.id), 0)

  if (decisions.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Accepted orders</h2>
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          <p>You have not answered any order yet.</p>
          <Button className="mt-3" variant="outline" onClick={() => setScreen('offers')}>
            Go to new orders
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Accepted orders</h2>
        <p className="text-sm text-muted-foreground">The payout on each row is the amount you were shown when you accepted.</p>
      </div>

      <Card size="sm" className="max-w-xs">
        <CardContent>
          <p className="text-xs text-muted-foreground">Expected payout from accepted orders</p>
          <p className="text-2xl font-semibold">{currency ? money(expected, currency) : '—'}</p>
          <p className="text-[11px] text-muted-foreground">
            {accepted.length} accepted · {decisions.length - accepted.length} declined
            {totalDeducted > 0 && currency && <> · {money(totalDeducted, currency)} deducted since</>}
          </p>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Answered</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="text-right">Items</TableHead>
            <TableHead>Your answer</TableHead>
            <TableHead className="text-right">Fee</TableHead>
            <TableHead className="text-right">Payout shown</TableHead>
            <TableHead className="text-right">Deducted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {decisions.map((d) => (
            <TableRow key={d.order.id} className={cn(!d.accepted && 'text-muted-foreground')}>
              <TableCell className="font-medium">{d.order.id}</TableCell>
              <TableCell>{dayAndTime(d.decidedAt)}</TableCell>
              <TableCell>{d.order.customer}</TableCell>
              <TableCell className="text-right">{itemCount(d.order)}</TableCell>
              <TableCell>
                <Badge variant={d.accepted ? 'default' : 'outline'}>{d.accepted ? 'Accepted' : 'Declined'}</Badge>
              </TableCell>
              <TableCell className="text-right font-mono">{d.accepted ? money(d.shown.fee, d.order.currency) : '—'}</TableCell>
              <TableCell className="text-right font-mono font-medium">{d.accepted ? money(d.shown.net, d.order.currency) : '—'}</TableCell>
              <TableCell className="text-right font-mono">
                {deducted(d.order.id) > 0 ? (
                  <button className="text-destructive underline-offset-2 hover:underline" onClick={() => setScreen('payouts')}>
                    {signedMoney(-deducted(d.order.id), d.order.currency)}
                  </button>
                ) : (
                  '—'
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
