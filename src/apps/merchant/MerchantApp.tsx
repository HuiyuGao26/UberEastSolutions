import { useState } from 'react'
import { CalendarClock, ClipboardList, CloudRain, Home, Inbox, ListOrdered, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { TabletFrame } from '@/components/shared/DeviceFrame'
import { ProposalTag } from '@/components/shared/ProposalTag'
import { clockTime, itemCount, money, percent, signedMoney } from '@/domain/format'
import { ORDER_STATUS } from '@/domain/labels'
import type { Adjustment, MerchantScreen, Order, OrderStatus } from '@/domain/types'
import { cn } from '@/lib/utils'
import {
  agentName,
  caseById,
  currentMerchant,
  kpis,
  merchantAdjustments,
  merchantOrders,
  merchantRequests,
  orderById,
  paidForOrder,
  pendingOffer,
} from '@/state/selectors'
import { useDemo, useDispatch } from '@/state/store'
import { OfferDialog } from './OfferDialog'

const NAV: { id: MerchantScreen['name']; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'orders', label: 'Orders', icon: ListOrdered },
  { id: 'payouts', label: 'Payouts', icon: Wallet },
  { id: 'requests', label: 'Requests', icon: Inbox },
]


export function MerchantApp() {
  const s = useDemo()
  const dispatch = useDispatch()
  const merchant = currentMerchant(s)
  const openRequests = merchantRequests(s).filter((r) => !r.answer).length
  const openAdjustments = merchantAdjustments(s).filter((a) => a.status === 'open').length
  const offer = pendingOffer(s)
  const screen = s.ui.merchant.name

  return (
    <TabletFrame>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-44 shrink-0 flex-col gap-1 border-r bg-muted/40 p-3">
          <div className="mb-3 px-2">
            <p className="font-semibold leading-tight">{merchant.name}</p>
            <p className="text-xs text-muted-foreground">{merchant.suburb} · Open</p>
          </div>
          {NAV.map((n) => {
            const Icon = n.icon
            const count = n.id === 'requests' ? openRequests : n.id === 'payouts' ? openAdjustments : 0
            return (
              <button
                key={n.id}
                onClick={() => dispatch({ type: 'ui/merchant', screen: { name: n.id } })}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-2 text-sm',
                  screen === n.id ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:bg-background/60',
                )}
              >
                <Icon className="size-4" />
                <span className="flex-1 text-left">{n.label}</span>
                {count > 0 && <Badge className="h-5 min-w-5 px-1.5">{count}</Badge>}
              </button>
            )
          })}
          <p className="mt-auto px-2 text-[11px] text-muted-foreground">Merchant tablet · {clockTime(s.clock)}</p>
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto p-5">
          {screen === 'home' && <MerchantHome />}
          {screen === 'orders' && <OrdersScreen />}
          {screen === 'payouts' && <PayoutsScreen />}
          {screen === 'requests' && <RequestsScreen />}
        </main>
      </div>
      {offer && <OfferDialog order={offer} />}
    </TabletFrame>
  )
}

function MerchantHome() {
  const s = useDemo()
  const orders = merchantOrders(s).filter((o) => o.status !== 'declined')
  const expectedToday = orders.reduce((sum, o) => sum + (o.payoutShownAtAcceptance ?? 0), 0)
  return (
    <div className="grid grid-cols-[1fr_260px] gap-4">
      <PeakForecastCard />
      <div className="space-y-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Live orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {orders.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-center justify-between text-sm">
                <span>
                  {o.id} <span className="text-muted-foreground">· {o.customerName}</span>
                </span>
                <StatusBadge status={o.status} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Tonight’s expected payout</CardTitle>
            <CardAction>
              <ProposalTag id="huiyu" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{money(expectedToday)}</p>
            <p className="text-xs text-muted-foreground">Sum of the net amounts shown when you accepted each order.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function PeakForecastCard() {
  const s = useDemo()
  const dispatch = useDispatch()
  const f = s.forecast
  const [extraStaff, setExtraStaff] = useState('1')
  const [prepAhead, setPrepAhead] = useState(true)
  const [buffer, setBuffer] = useState('5')
  const max = Math.max(...f.slots.map((x) => x.expected))
  const uplift = f.expectedOrders / f.typicalOrders - 1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudRain className="size-5 text-violet-600" /> Busy night ahead: {f.window}
        </CardTitle>
        <CardDescription>
          About <b className="text-foreground">{f.expectedOrders} orders</b> expected, against {f.typicalOrders} on a typical Friday (+{percent(uplift)}).
          Confidence: {f.confidence}.
        </CardDescription>
        <CardAction>
          <ProposalTag id="julia" />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex h-28 items-end gap-2">
            {f.slots.map((slot) => (
              <div key={slot.label} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-24 w-full items-end justify-center gap-0.5">
                  <div className="w-2/5 rounded-t bg-zinc-300" style={{ height: `${(slot.typical / max) * 100}%` }} title={`Typical: ${slot.typical}`} />
                  <div className="w-2/5 rounded-t bg-violet-500" style={{ height: `${(slot.expected / max) * 100}%` }} title={`Expected: ${slot.expected}`} />
                </div>
                <span className="text-[10px] text-muted-foreground">{slot.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-violet-500" /> Expected tonight</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-zinc-300" /> Typical Friday</span>
            <span>Orders per 30 min</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="mb-1 font-medium">Why</p>
            <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
              {f.drivers.map((d) => <li key={d}>{d}</li>)}
            </ul>
          </div>
          <div>
            <p className="mb-1 font-medium">Suggested</p>
            <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
              {f.suggestions.map((d) => <li key={d}>{d}</li>)}
            </ul>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-wrap gap-3">
        {f.plan ? (
          <p className="flex items-center gap-2 text-sm">
            <CalendarClock className="size-4 text-violet-600" />
            Plan confirmed: +{f.plan.extraStaff} staff, {f.plan.prepAhead ? 'prep ahead' : 'no prep ahead'}, +{f.plan.prepBufferMin} min prep buffer.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Extra staff</Label>
              <Select value={extraStaff} onValueChange={setExtraStaff}>
                <SelectTrigger size="sm" className="w-16"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['0', '1', '2'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Prep buffer</Label>
              <Select value={buffer} onValueChange={setBuffer}>
                <SelectTrigger size="sm" className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['0', '5', '10'].map((v) => <SelectItem key={v} value={v}>+{v} min</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="prep" checked={prepAhead} onCheckedChange={(v) => setPrepAhead(v === true)} />
              <Label htmlFor="prep" className="text-xs">Prep ahead</Label>
            </div>
            <Button
              className="ml-auto"
              onClick={() => {
                dispatch({ type: 'forecast/plan', plan: { extraStaff: Number(extraStaff), prepAhead, prepBufferMin: Number(buffer) } })
                toast.success('Plan saved for tonight')
              }}
            >
              Confirm plan
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  )
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const st = ORDER_STATUS[status]
  return <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', st.className)}>{st.label}</span>
}

function OrdersScreen() {
  const s = useDemo()
  const orders = merchantOrders(s)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tonight’s orders</h2>
        <ProposalTag id="huiyu" />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Placed</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Shown at acceptance</TableHead>
            <TableHead className="text-right">Paid</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => {
            const paid = paidForOrder(s, o)
            const changed = paid !== undefined && o.payoutShownAtAcceptance !== undefined && Math.abs(paid - o.payoutShownAtAcceptance) > 0.005
            return (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.id}</TableCell>
                <TableCell>{clockTime(o.placedAt)}</TableCell>
                <TableCell>{o.customerName}</TableCell>
                <TableCell>{itemCount(o)}</TableCell>
                <TableCell><StatusBadge status={o.status} /></TableCell>
                <TableCell className="text-right">{o.payoutShownAtAcceptance !== undefined ? money(o.payoutShownAtAcceptance) : '—'}</TableCell>
                <TableCell className={cn('text-right', changed && 'font-medium text-destructive')}>
                  {paid !== undefined ? money(paid) : '—'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function PayoutsScreen() {
  const s = useDemo()
  const k = kpis(s)
  const adjustments = merchantAdjustments(s)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Payouts</h2>
        <ProposalTag id="huiyu" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card size="sm">
          <CardContent>
            <p className="text-xs text-muted-foreground">Paid as shown at acceptance (this week)</p>
            <p className="text-2xl font-semibold">{percent(k.mppr)}</p>
            <p className="text-[11px] text-muted-foreground">{k.payoutsCounted} orders · within 2% counts as paid as shown</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-xs text-muted-foreground">Open deductions</p>
            <p className="text-2xl font-semibold">{adjustments.filter((a) => a.status === 'open').length}</p>
            <p className="text-[11px] text-muted-foreground">Each one can be challenged from the day it is made</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-xs text-muted-foreground">Next payout</p>
            <p className="text-2xl font-semibold">Mon 19 Oct</p>
            <p className="text-[11px] text-muted-foreground">Weekly statement</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Deductions</h3>
        {adjustments.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No deductions. If an order is refunded because of something on your side, it appears here on the same day, with the reason and a way to challenge it.
          </p>
        ) : (
          <div className="space-y-3">
            {adjustments.map((a) => <AdjustmentCard key={a.id} adjustment={a} />)}
          </div>
        )}
      </div>
    </div>
  )
}

const ADJ_STATUS: Record<Adjustment['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  open: { label: 'Open: you can challenge', variant: 'destructive' },
  challenged: { label: 'Challenged: with case owner', variant: 'secondary' },
  upheld: { label: 'Upheld', variant: 'outline' },
  reversed: { label: 'Reversed', variant: 'default' },
}

function AdjustmentCard({ adjustment: a }: { adjustment: Adjustment }) {
  const s = useDemo()
  const dispatch = useDispatch()
  const c = caseById(s, a.caseId)
  const order = orderById(s, a.orderId) as Order
  const [writing, setWriting] = useState(false)
  const [text, setText] = useState('Both sodas were packed. Our packing photo shows two Feijoa sodas in the sealed bag at 6:40 pm.')

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {signedMoney(-a.amount)} · {a.orderId}
          <Badge variant={ADJ_STATUS[a.status].variant}>{ADJ_STATUS[a.status].label}</Badge>
        </CardTitle>
        <CardDescription>
          Made today at {clockTime(a.createdAt)} · case {a.caseId} · owner {agentName(s, c?.ownerId)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>{a.reason}</p>
        <div className="rounded-md bg-muted/60 p-3">
          {a.lines.map((l) => (
            <div key={l.label} className="flex justify-between">
              <span>{l.label}</span>
              <span className="font-mono">{l.amount === 0 ? '' : signedMoney(l.amount)}</span>
            </div>
          ))}
          <Separator className="my-2" />
          <div className="flex justify-between font-medium">
            <span>Payout for this order</span>
            <span className="font-mono">
              {money(order.payoutShownAtAcceptance ?? 0)} → {money(paidForOrder(s, order) ?? 0)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>Notice and challenge route: today ✓</span>
          <span>Challenge by: {a.respondBy} (30 days from the order date)</span>
          <span>Decision due by: {a.decisionDueBy} (day 7)</span>
        </div>
        {a.merchantResponse && (
          <p className="rounded-md border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-xs">
            <b>Your challenge:</b> {a.merchantResponse}
          </p>
        )}
        {a.decisionNote && (
          <p className="rounded-md border-l-2 border-primary bg-primary/5 px-3 py-2 text-xs">
            <b>Decision:</b> {a.status === 'reversed' ? `Reversed. ${money(a.amount)} is back in your payout.` : 'Upheld.'} {a.decisionNote}
          </p>
        )}
        {a.status === 'open' && writing && (
          <div className="space-y-2">
            <Label htmlFor={`ch-${a.id}`}>Why should this deduction be reversed?</Label>
            <Textarea id={`ch-${a.id}`} value={text} onChange={(e) => setText(e.target.value)} rows={3} />
          </div>
        )}
      </CardContent>
      {a.status === 'open' && (
        <CardFooter className="justify-end gap-2">
          {writing ? (
            <>
              <Button variant="ghost" onClick={() => setWriting(false)}>Cancel</Button>
              <Button
                disabled={!text.trim()}
                onClick={() => {
                  dispatch({ type: 'merchant/challenge', adjustmentId: a.id, response: text.trim() })
                  toast.success('Challenge sent to the case owner')
                }}
              >
                Send challenge
              </Button>
            </>
          ) : (
            <Button onClick={() => setWriting(true)}>
              <ClipboardList /> Challenge this deduction
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}

function RequestsScreen() {
  const s = useDemo()
  const requests = merchantRequests(s).sort((a, b) => b.askedAt - a.askedAt)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Requests from support</h2>
          <p className="text-sm text-muted-foreground">Questions from the person who owns each case. Your answer goes straight into their case record.</p>
        </div>
        <ProposalTag id="aabhas" />
      </div>
      {requests.length === 0 && <p className="text-sm text-muted-foreground">No requests.</p>}
      {requests.map((r) => <RequestCard key={r.id} requestId={r.id} />)}
    </div>
  )
}

const SUGGESTED_ANSWERS = [
  'Both sodas were packed and the bag was sealed with our sticker.',
  'We were very busy; I can’t confirm the drinks were packed.',
]

function RequestCard({ requestId }: { requestId: string }) {
  const s = useDemo()
  const dispatch = useDispatch()
  const r = s.requests.find((x) => x.id === requestId)!
  const c = caseById(s, r.caseId)
  const [answer, setAnswer] = useState('')
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">{r.question}</CardTitle>
        <CardDescription>
          Case {r.caseId} · order {c?.orderId} · asked by {agentName(s, c?.ownerId)} at {clockTime(r.askedAt)}
        </CardDescription>
        <CardAction>{r.answer ? <Badge variant="outline">Answered</Badge> : <Badge variant="destructive">Waiting for you</Badge>}</CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        {r.answer ? (
          <p className="text-sm"><span className="text-muted-foreground">You replied:</span> {r.answer}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_ANSWERS.map((t) => (
                <button key={t} onClick={() => setAnswer(t)} className="rounded-full border px-2.5 py-1 text-xs hover:bg-muted">
                  {t}
                </button>
              ))}
            </div>
            <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type your answer" rows={2} />
          </>
        )}
      </CardContent>
      {!r.answer && (
        <CardFooter className="justify-end">
          <Button
            disabled={!answer.trim()}
            onClick={() => {
              dispatch({ type: 'merchant/answer', requestId: r.id, answer: answer.trim() })
              toast.success('Answer added to the case')
            }}
          >
            Send answer
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
