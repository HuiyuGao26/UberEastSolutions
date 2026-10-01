import { useState } from 'react'
import { ArrowLeft, Bot, Lock, MapPin, Radio, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { CaseTimeline } from '@/components/shared/CaseTimeline'
import { FakeMap } from '@/components/shared/FakeMap'
import { ProposalTag } from '@/components/shared/ProposalTag'
import { clockTime, money } from '@/domain/format'
import type { Adjustment, Case, Fault, Order, Resolution } from '@/domain/types'
import {
  adjustmentForCase,
  agentName,
  caseById,
  currentAgent,
  hasSpecialistInput,
  merchantOf,
  orderById,
  requestsForCase,
} from '@/state/selectors'
import { useDemo, useDispatch } from '@/state/store'
import { ISSUE_LABEL, ORDER_STATUS } from '@/domain/labels'
import { CaseStatusBadge } from './CaseStatusBadge'

export function CaseDetail({ caseId }: { caseId?: string }) {
  const s = useDemo()
  const dispatch = useDispatch()
  const c = caseById(s, caseId)
  const order = c && orderById(s, c.orderId)
  if (!c || !order) return null

  const agent = currentAgent(s)
  const isMine = c.ownerId === agent.id
  const canAct = isMine && (c.status === 'open' || c.status === 'awaiting_info')
  const adjustment = adjustmentForCase(s, c.id)

  return (
    <div className="grid grid-cols-[1fr_300px] gap-4 p-5">
      <div className="min-w-0 space-y-4">
        <button onClick={() => dispatch({ type: 'ui/support', screen: { name: 'queue' } })} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" /> All cases
        </button>

        <div className="space-y-1.5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            {c.id} · {ISSUE_LABEL[c.type]} <CaseStatusBadge status={c.status} />
          </h2>
          <p className="text-sm text-muted-foreground">
            Order {order.id} · {merchantOf(s, order).name} · customer {order.customerName} · opened {clockTime(c.openedAt)}
          </p>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <Badge variant="outline">
              Owner: {c.ownerId ? agentName(s, c.ownerId) : 'System (automatic)'}
              {isMine && ' (you)'}
            </Badge>
            <Badge variant="outline">Ownership transfers: {c.ownershipTransfers}</Badge>
            <Badge variant="outline">Customer contacts: {c.customerContacts}</Badge>
          </div>
        </div>

        {!c.ownerId && (
          <Alert>
            <Bot />
            <AlertTitle>Handled automatically</AlertTitle>
            <AlertDescription>Live courier data verified the delay, so the customer got an answer without waiting for an agent.</AlertDescription>
          </Alert>
        )}
        {c.ownerId && !isMine && (
          <Alert>
            <Lock />
            <AlertTitle>Owned by {agentName(s, c.ownerId)}</AlertTitle>
            <AlertDescription>You can read the shared record. The case does not move to you; its owner keeps it until it closes.</AlertDescription>
          </Alert>
        )}

        {c.status === 'merchant_challenge' && adjustment && isMine && <ChallengeReview adjustment={adjustment} />}
        {canAct && <OwnerActions c={c} order={order} />}

        <Card size="sm">
          <CardHeader>
            <CardTitle>Shared case record</CardTitle>
            <CardDescription>Everything about this case in one place. Nobody has to ask the customer again.</CardDescription>
            <CardAction>
              <ProposalTag id="aabhas" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <CaseTimeline events={c.events} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <LiveOrderPanel order={order} />
        <RequestsPanel caseId={c.id} />
      </div>
    </div>
  )
}

function LiveOrderPanel({ order }: { order: Order }) {
  const s = useDemo()
  const courier = s.couriers.find((x) => x.id === order.courierId)!
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <Radio className="size-4 text-sky-600" /> Live order data
        </CardTitle>
        <CardAction>
          <ProposalTag id="manu" />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <FakeMap progress={courier.progress} />
        <div className="space-y-1 text-xs">
          <Fact label="Status" value={ORDER_STATUS[order.status].label} />
          <Fact label="Courier" value={`${courier.name} (${courier.vehicle}) · ping ${courier.lastPingSec} s ago`} />
          <Fact label="Courier note" value={courier.note} />
          {order.status !== 'delivered' && (
            <Fact label="ETA" value={`${clockTime(order.etaAt + order.delayMin)}${order.delayMin ? ` (+${order.delayMin} min)` : ''}`} />
          )}
          <Fact label="Payout shown to merchant" value={order.payoutShownAtAcceptance !== undefined ? money(order.payoutShownAtAcceptance) : '—'} />
        </div>
        <Separator />
        <div className="space-y-0.5 text-xs">
          {order.items.map((i) => (
            <div key={i.name} className="flex justify-between">
              <span>{i.qty} × {i.name}</span>
              <span className="font-mono">{money(i.unitPrice)} ea</span>
            </div>
          ))}
        </div>
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="size-3" /> No phone calls needed: location and status come from the courier app.
        </p>
      </CardContent>
    </Card>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0">{value}</span>
    </div>
  )
}

function RequestsPanel({ caseId }: { caseId: string }) {
  const s = useDemo()
  const requests = requestsForCase(s, caseId)
  if (!requests.length) return null
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Information requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {requests.map((r) => (
          <div key={r.id} className="space-y-1">
            <p>
              <Badge variant="outline" className="mr-1 capitalize">{r.party}</Badge>
              {r.question}
            </p>
            <p className={r.answer ? '' : 'text-muted-foreground'}>{r.answer ? `“${r.answer}”` : 'Waiting for a reply…'}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/** Sum of the prices of items the customer named in the report. */
function suggestedAmount(c: Case, order: Order): number {
  const named = order.items.filter((i) => c.detail.includes(i.name))
  if (named.length) return named.reduce((sum, i) => sum + i.unitPrice, 0)
  return 5
}

const QUESTIONS = {
  merchant: 'Can you confirm whether both Feijoa sodas were packed for this order?',
  courier: 'Was the bag sealed when you picked it up?',
}

function OwnerActions({ c, order }: { c: Case; order: Order }) {
  const s = useDemo()
  const dispatch = useDispatch()
  const agent = currentAgent(s)
  const [party, setParty] = useState<'merchant' | 'courier'>('merchant')
  const [question, setQuestion] = useState(QUESTIONS.merchant)
  const [consultNote, setConsultNote] = useState('Customer report and courier confirmation conflict; please advise.')
  const [kind, setKind] = useState<Resolution['kind']>('refund')
  const [amount, setAmount] = useState(String(suggestedAmount(c, order)))
  const [fault, setFault] = useState<Fault>(c.type === 'late' || c.type === 'not_delivered' ? 'courier' : 'merchant')
  const [note, setNote] = useState('Customer photo shows one soda; the courier confirms the bag was sealed at pickup.')

  const value = Number(amount) || 0
  const limit = kind === 'voucher' ? agent.voucherLimit : agent.refundLimit
  const overLimit = kind !== 'no_action' && value > limit && !hasSpecialistInput(c)

  return (
    <Card size="sm" className="ring-primary/30">
      <CardHeader>
        <CardTitle>Work this case</CardTitle>
        <CardDescription>Ask for what you need, get specialist input if required, then decide. The case stays with you throughout.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="ask">
          <TabsList>
            <TabsTrigger value="ask">Ask for information</TabsTrigger>
            <TabsTrigger value="specialist">Specialist input</TabsTrigger>
            <TabsTrigger value="resolve">Resolve</TabsTrigger>
          </TabsList>

          <TabsContent value="ask" className="space-y-3 pt-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Ask the</Label>
              <Select
                value={party}
                onValueChange={(v) => {
                  setParty(v as 'merchant' | 'courier')
                  setQuestion(QUESTIONS[v as 'merchant' | 'courier'])
                }}
              >
                <SelectTrigger size="sm" className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="merchant">Merchant</SelectItem>
                  <SelectItem value="courier">Courier</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">They answer into this case; they do not take it over.</span>
            </div>
            <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} />
            <Button
              disabled={!question.trim()}
              onClick={() => {
                dispatch({ type: 'owner/request', caseId: c.id, party, question: question.trim() })
                toast.success(`Question sent to the ${party}`)
              }}
            >
              Send question
            </Button>
          </TabsContent>

          <TabsContent value="specialist" className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">Specialist Review gives a recommendation. You keep ownership and make the final decision.</p>
            <Textarea value={consultNote} onChange={(e) => setConsultNote(e.target.value)} rows={2} />
            <Button
              variant="secondary"
              disabled={!consultNote.trim()}
              onClick={() => {
                dispatch({ type: 'owner/consult', caseId: c.id, note: consultNote.trim() })
                toast('Specialist recommendation added to the case')
              }}
            >
              Ask Specialist Review
            </Button>
          </TabsContent>

          <TabsContent value="resolve" className="space-y-3 pt-3">
            <RadioGroup value={kind} onValueChange={(v) => setKind(v as Resolution['kind'])} className="flex gap-4">
              {(['refund', 'voucher', 'no_action'] as const).map((k) => (
                <Label key={k} htmlFor={`k-${k}`} className="flex items-center gap-2 font-normal">
                  <RadioGroupItem id={`k-${k}`} value={k} />
                  {k === 'refund' ? 'Refund' : k === 'voucher' ? 'Voucher' : 'No compensation'}
                </Label>
              ))}
            </RadioGroup>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="amt" className="text-xs">Amount (NZD)</Label>
                <Input id="amt" type="number" min="0" step="0.5" value={kind === 'no_action' ? '0' : amount} disabled={kind === 'no_action'} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Responsible party</Label>
                <Select value={fault} onValueChange={(v) => setFault(v as Fault)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merchant">Merchant</SelectItem>
                    <SelectItem value="courier">Courier</SelectItem>
                    <SelectItem value="platform">Platform</SelectItem>
                    <SelectItem value="none">No one</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Reason, shown to the customer and the merchant" />
            {overLimit ? (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <Lock className="size-3.5" /> Above your limit of {money(limit)}. Ask Specialist Review first.
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5" /> Within your decision rights.
                {kind === 'refund' && fault === 'merchant' && value > 0 && ' The merchant is notified today with the reason and can challenge it.'}
              </p>
            )}
            <Button
              disabled={overLimit || (kind !== 'no_action' && value <= 0) || !note.trim()}
              onClick={() => {
                dispatch({
                  type: 'owner/resolve',
                  caseId: c.id,
                  resolution: { kind, amount: kind === 'no_action' ? 0 : value, fault, note: note.trim() },
                })
                toast.success('Decision sent to the customer')
              }}
            >
              Resolve case
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function ChallengeReview({ adjustment: a }: { adjustment: Adjustment }) {
  const dispatch = useDispatch()
  const [note, setNote] = useState('Merchant packing photo shows both sodas in the sealed bag.')
  return (
    <Card size="sm" className="ring-rose-300">
      <CardHeader>
        <CardTitle>Merchant challenged the deduction</CardTitle>
        <CardDescription>
          {money(a.amount)} on {a.orderId} · decision due by {a.decisionDueBy}
        </CardDescription>
        <CardAction>
          <ProposalTag id="huiyu" />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="rounded-md border-l-2 border-amber-400 bg-amber-50 px-3 py-2">“{a.merchantResponse}”</p>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            dispatch({ type: 'owner/decide', adjustmentId: a.id, decision: 'upheld', note: note.trim() })
            toast('Deduction upheld')
          }}
        >
          Uphold deduction
        </Button>
        <Button
          onClick={() => {
            dispatch({ type: 'owner/decide', adjustmentId: a.id, decision: 'reversed', note: note.trim() })
            toast.success('Deduction reversed')
          }}
        >
          Reverse deduction
        </Button>
      </CardFooter>
    </Card>
  )
}
