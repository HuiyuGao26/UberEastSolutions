import { useState } from 'react'
import { ArrowLeft, BadgeCheck, CircleHelp, Clock, Headset, LifeBuoy, PackageCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { CaseTimeline } from '@/components/shared/CaseTimeline'
import { PhoneFrame } from '@/components/shared/DeviceFrame'
import { FakeMap } from '@/components/shared/FakeMap'
import { ProposalTag } from '@/components/shared/ProposalTag'
import { clockTime, money } from '@/domain/format'
import type { Case, IssueType, Order } from '@/domain/types'
import { cn } from '@/lib/utils'
import { agentName, caseById, heroOrder, merchantOf } from '@/state/selectors'
import { useDemo, useDispatch } from '@/state/store'

export function CustomerApp() {
  const s = useDemo()
  const screen = s.ui.customer
  return (
    <PhoneFrame statusTime={clockTime(s.clock).replace(/ [ap]m/, '')}>
      {screen.name === 'tracking' && <Tracking />}
      {screen.name === 'help' && <Help />}
      {screen.name === 'case' && <CaseView caseId={screen.caseId} />}
    </PhoneFrame>
  )
}

const STAGES: { status: Order['status'][]; label: string }[] = [
  { status: ['offered', 'preparing', 'on_the_way', 'delivered'], label: 'Placed' },
  { status: ['preparing', 'on_the_way', 'delivered'], label: 'Preparing' },
  { status: ['on_the_way', 'delivered'], label: 'On the way' },
  { status: ['delivered'], label: 'Delivered' },
]

function Tracking() {
  const s = useDemo()
  const dispatch = useDispatch()
  const order = heroOrder(s)
  const merchant = merchantOf(s, order)
  const courier = s.couriers.find((c) => c.id === order.courierId)!
  const cases = s.cases.filter((c) => c.orderId === order.id)

  if (order.status === 'scheduled') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <PackageCheck className="size-10 text-muted-foreground" />
        <p className="font-medium">No active order</p>
        <p className="text-sm text-muted-foreground">Mia orders from {merchant.name} at {clockTime(order.placedAt)}. Use the demo guide to continue.</p>
      </div>
    )
  }

  const eta = order.etaAt + order.delayMin
  const headline =
    order.status === 'offered'
      ? 'Waiting for the restaurant to accept'
      : order.status === 'declined'
        ? 'The restaurant could not take this order'
        : order.status === 'delivered'
          ? 'Delivered'
          : order.status === 'preparing'
            ? 'Your food is being prepared'
            : 'Your order is on the way'

  return (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-xs text-muted-foreground">{merchant.name} · {order.id}</p>
        <h2 className="text-xl font-semibold leading-tight">{headline}</h2>
        {order.status !== 'delivered' && order.status !== 'declined' && (
          <p className={cn('text-sm', order.delayMin ? 'text-destructive' : 'text-muted-foreground')}>
            Arriving {clockTime(eta)}
            {order.delayMin ? ` · ${order.delayMin} min later than first estimated` : ''}
          </p>
        )}
      </div>

      <div className="flex gap-1">
        {STAGES.map((st) => (
          <div key={st.label} className="flex-1 space-y-1">
            <div className={cn('h-1.5 rounded-full', st.status.includes(order.status) ? 'bg-primary' : 'bg-muted')} />
            <p className="text-[10px] text-muted-foreground">{st.label}</p>
          </div>
        ))}
      </div>

      <FakeMap progress={courier.progress} label={order.status === 'on_the_way' ? `${courier.name} · ${courier.note}` : undefined} />

      <Card size="sm">
        <CardContent className="space-y-1 text-sm">
          {order.items.map((i) => (
            <div key={i.name} className="flex justify-between">
              <span>{i.qty} × {i.name}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {cases.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Your help requests</p>
          {cases.map((c) => (
            <button
              key={c.id}
              onClick={() => dispatch({ type: 'ui/customer', screen: { name: 'case', caseId: c.id } })}
              className="flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm hover:bg-muted/50"
            >
              <span>{ISSUE_TEXT[c.type]}</span>
              <CaseBadge c={c} />
            </button>
          ))}
        </div>
      )}

      {['on_the_way', 'delivered'].includes(order.status) && (
        <Button className="w-full" size="lg" onClick={() => dispatch({ type: 'ui/customer', screen: { name: 'help' } })}>
          <LifeBuoy /> Get help with this order
        </Button>
      )}
    </div>
  )
}

const ISSUE_TEXT: Record<IssueType, string> = {
  late: 'My order is late',
  missing_item: 'Something is missing',
  wrong_item: 'I got the wrong item',
  not_delivered: 'My order never arrived',
}

function Help() {
  const s = useDemo()
  const dispatch = useDispatch()
  const order = heroOrder(s)
  const options: IssueType[] = order.status === 'on_the_way' ? ['late'] : ['missing_item', 'wrong_item', 'not_delivered']
  const [issue, setIssue] = useState<IssueType>(options[0])
  const [items, setItems] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState(true)

  const needsItems = issue === 'missing_item' || issue === 'wrong_item'
  const detail = [
    needsItems && items.length ? items.map((i) => `1 × ${i}`).join(', ') : '',
    note.trim(),
    needsItems && photo ? 'photo attached' : '',
  ]
    .filter(Boolean)
    .join('; ')

  return (
    <div className="space-y-4 p-4">
      <button onClick={() => dispatch({ type: 'ui/customer', screen: { name: 'tracking' } })} className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Back to order
      </button>
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-xl font-semibold">What went wrong?</h2>
        <ProposalTag id={issue === 'late' ? 'manu' : 'aabhas'} />
      </div>

      <RadioGroup value={issue} onValueChange={(v) => setIssue(v as IssueType)} className="gap-2">
        {options.map((o) => (
          <Label key={o} htmlFor={o} className="flex items-center gap-3 rounded-lg border p-3 font-normal has-data-[state=checked]:border-primary">
            <RadioGroupItem id={o} value={o} />
            {ISSUE_TEXT[o]}
          </Label>
        ))}
      </RadioGroup>

      {needsItems && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Which items?</p>
          {order.items.map((i) => (
            <div key={i.name} className="flex items-center gap-2">
              <Checkbox
                id={`it-${i.name}`}
                checked={items.includes(i.name)}
                onCheckedChange={(v) => setItems((prev) => (v ? [...prev, i.name] : prev.filter((x) => x !== i.name)))}
              />
              <Label htmlFor={`it-${i.name}`} className="font-normal">{i.name}</Label>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <Checkbox id="photo" checked={photo} onCheckedChange={(v) => setPhoto(v === true)} />
            <Label htmlFor="photo" className="font-normal">Attach a photo of what arrived (demo)</Label>
          </div>
        </div>
      )}

      <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything else? (optional)" rows={2} />

      {issue === 'late' && (
        <p className="flex gap-2 rounded-lg bg-sky-50 p-3 text-xs text-sky-900">
          <Clock className="mt-0.5 size-3.5 shrink-0" />
          We check your courier’s live location first. If the delay is confirmed, you get an answer straight away.
        </p>
      )}

      <Button
        className="w-full"
        size="lg"
        disabled={needsItems && items.length === 0}
        onClick={() => dispatch({ type: 'customer/report', orderId: order.id, issue, detail })}
      >
        Send
      </Button>
    </div>
  )
}

function CaseBadge({ c }: { c: Case }) {
  const map: Record<Case['status'], string> = {
    voucher_offered: 'Answer ready',
    open: 'In progress',
    awaiting_info: 'In progress',
    with_specialist: 'In progress',
    resolved: 'Outcome ready',
    merchant_challenge: 'Outcome ready',
    closed: 'Closed',
  }
  return <Badge variant={c.status === 'closed' ? 'outline' : 'secondary'}>{map[c.status]}</Badge>
}

function CaseView({ caseId }: { caseId?: string }) {
  const s = useDemo()
  const dispatch = useDispatch()
  const c = caseById(s, caseId)
  if (!c) return null
  const order = heroOrder(s)
  const courier = s.couriers.find((x) => x.id === order.courierId)!
  const owner = agentName(s, c.ownerId)
  const waitingOnOutcome = c.status === 'resolved' || (c.status === 'merchant_challenge' && c.closedAt === undefined)

  return (
    <div className="space-y-4 p-4">
      <button onClick={() => dispatch({ type: 'ui/customer', screen: { name: 'tracking' } })} className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Back to order
      </button>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Help request {c.id}</p>
          <h2 className="text-xl font-semibold">{ISSUE_TEXT[c.type]}</h2>
        </div>
        <CaseBadge c={c} />
      </div>

      {c.status === 'voucher_offered' && (
        <Card className="border-sky-200 bg-sky-50/60">
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 font-medium"><BadgeCheck className="size-4 text-sky-700" /> We checked: you’re right</p>
              <ProposalTag id="manu" />
            </div>
            <p className="text-sm">
              {courier.name} is {order.delayMin} minutes behind the first estimate. Live location shows: {courier.note}. New arrival time: {clockTime(order.etaAt + order.delayMin)}.
            </p>
            <p className="text-sm">Sorry about that. Here is a <b>{money(c.voucherOffer ?? 0)}</b> voucher for your next order.</p>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => dispatch({ type: 'customer/voucher', caseId: c.id, accept: true })}>Accept voucher</Button>
              <Button variant="outline" className="flex-1" onClick={() => dispatch({ type: 'customer/voucher', caseId: c.id, accept: false })}>
                <Headset /> Talk to a person
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {['open', 'awaiting_info', 'with_specialist'].includes(c.status) && (
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="font-medium">{owner} is looking after this</p>
              <ProposalTag id="aabhas" />
            </div>
            <p className="text-sm text-muted-foreground">
              One person owns your request until it is solved. They can already see your order, the courier’s trip and what you sent, so you won’t need to explain it again.
            </p>
          </CardContent>
        </Card>
      )}

      {waitingOnOutcome && c.resolution && (
        <Card>
          <CardContent className="space-y-3">
            <p className="font-medium">
              {c.resolution.kind === 'refund'
                ? `${money(c.resolution.amount)} refunded to your card`
                : c.resolution.kind === 'voucher'
                  ? `${money(c.resolution.amount)} voucher added`
                  : 'No refund for this request'}
            </p>
            <p className="text-sm text-muted-foreground">Decided by {owner}. {c.resolution.note}</p>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => dispatch({ type: 'customer/respond', caseId: c.id, accept: true })}>That’s fine</Button>
              <Button variant="outline" className="flex-1" onClick={() => dispatch({ type: 'customer/respond', caseId: c.id, accept: false })}>
                <CircleHelp /> Ask for a review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {c.status === 'closed' && c.resolution && (
        <p className="rounded-lg bg-muted p-3 text-sm">
          Closed. {c.resolution.kind === 'voucher' ? `${money(c.resolution.amount)} voucher added to your account.` : c.resolution.kind === 'refund' ? `${money(c.resolution.amount)} refunded.` : ''}
        </p>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">What has happened</p>
        <CaseTimeline events={c.events.filter((e) => !e.internal)} compact />
      </div>
    </div>
  )
}
