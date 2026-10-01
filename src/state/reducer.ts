import { AUTO_VOUCHER, DAY_SEVEN, ORDER_DATE_PLUS_30, T, createSeed } from '@/domain/mock'
import { money, round2 } from '@/domain/format'
import { STEPS, type CaseRef, type Simulation } from '@/demo/steps'
import type {
  Actor,
  Case,
  CustomerScreen,
  DemoState,
  IssueType,
  MerchantScreen,
  PeakPlan,
  Resolution,
  Role,
  SupportScreen,
} from '@/domain/types'
import { agentName, caseById, heroCase, heroOrder, merchantOf, offerBreakdown, orderById } from './selectors'

export type Action =
  | { type: 'reset' }
  | { type: 'ui/role'; role: Role }
  | { type: 'ui/merchant'; screen: MerchantScreen }
  | { type: 'ui/customer'; screen: CustomerScreen }
  | { type: 'ui/support'; screen: SupportScreen }
  | { type: 'ui/toggleTags' }
  | { type: 'ui/toggleGuide' }
  | { type: 'demo/go'; stepId: string }
  | { type: 'sim'; simulation: Simulation }
  | { type: 'forecast/plan'; plan: PeakPlan }
  | { type: 'order/accept'; orderId: string }
  | { type: 'order/decline'; orderId: string }
  | { type: 'customer/report'; orderId: string; issue: IssueType; detail: string }
  | { type: 'customer/voucher'; caseId: string; accept: boolean }
  | { type: 'customer/respond'; caseId: string; accept: boolean }
  | { type: 'owner/request'; caseId: string; party: 'merchant' | 'courier'; question: string }
  | { type: 'owner/consult'; caseId: string; note: string }
  | { type: 'owner/resolve'; caseId: string; resolution: Resolution }
  | { type: 'owner/decide'; adjustmentId: string; decision: 'upheld' | 'reversed'; note: string }
  | { type: 'merchant/answer'; requestId: string; answer: string }
  | { type: 'merchant/challenge'; adjustmentId: string; response: string }

const ISSUE_LABEL: Record<IssueType, string> = {
  late: 'order is late',
  missing_item: 'item missing',
  wrong_item: 'wrong item',
  not_delivered: 'order not delivered',
}

function tick(s: DemoState, minutes: number) {
  s.clock += minutes
}

function nextId(s: DemoState, prefix: string): string {
  s.seq += 1
  return `${prefix}-${s.seq}`
}

function log(c: Case, at: number, actor: Actor, text: string, internal = false) {
  c.events.push(internal ? { at, actor, text, internal } : { at, actor, text })
}

function mutateCase(s: DemoState, caseId: string, fn: (c: Case) => void) {
  const c = s.cases.find((x) => x.id === caseId)
  if (c) fn(c)
}

function resolveCaseRef(s: DemoState, ref: CaseRef): string | undefined {
  return heroCase(s, ref === 'heroLate' ? 'late' : 'missing_item')?.id
}

function simulate(s: DemoState, simulation: Simulation) {
  const order = heroOrder(s)
  const courier = s.couriers.find((c) => c.id === order.courierId)!
  if (simulation === 'releaseOffer' && order.status === 'scheduled') {
    order.status = 'offered'
    s.clock = Math.max(s.clock, T.heroOffer)
  }
  if (simulation === 'courierLate' && order.status === 'preparing') {
    order.status = 'on_the_way'
    order.delayMin = 18
    courier.progress = 0.45
    courier.lastPingSec = 20
    courier.note = 'Slow traffic on Ponsonby Rd'
    s.clock = Math.max(s.clock, T.courierLate)
  }
  if (simulation === 'delivered' && order.status === 'on_the_way') {
    order.status = 'delivered'
    courier.progress = 1
    courier.note = 'Delivered to the door, 7:14 pm'
    s.clock = Math.max(s.clock, T.delivered)
  }
}

function navigate(s: DemoState, stepId: string) {
  const step = STEPS.find((x) => x.id === stepId)
  if (!step) return
  const t = step.target
  if (t.simulate) simulate(s, t.simulate)
  s.ui.role = t.role
  if (t.merchant) s.ui.merchant = { name: t.merchant }
  if (t.customer) {
    s.ui.customer =
      t.customer === 'tracking'
        ? { name: 'tracking' }
        : { name: 'case', caseId: resolveCaseRef(s, t.customer.case) }
    if (s.ui.customer.name === 'case' && !s.ui.customer.caseId) s.ui.customer = { name: 'tracking' }
  }
  if (t.support) {
    s.ui.support =
      typeof t.support === 'string'
        ? { name: t.support }
        : { name: 'case', caseId: resolveCaseRef(s, t.support.case) }
    if (s.ui.support.name === 'case' && !s.ui.support.caseId) s.ui.support = { name: 'queue' }
  }
}

function report(s: DemoState, orderId: string, issue: IssueType, detail: string) {
  const order = orderById(s, orderId)
  if (!order) return
  tick(s, 2)

  // A second report about the same problem is a repeat contact, not a new case.
  const existing = s.cases.find((c) => c.orderId === orderId && c.type === issue && c.status !== 'closed')
  if (existing) {
    existing.customerContacts += 1
    log(existing, s.clock, 'customer', `Contacted support again: ${detail || ISSUE_LABEL[issue]}.`)
    s.ui.customer = { name: 'case', caseId: existing.id }
    return
  }

  const courier = s.couriers.find((c) => c.id === order.courierId)
  const c: Case = {
    id: nextId(s, 'CS'),
    orderId,
    type: issue,
    detail,
    status: 'open',
    openedAt: s.clock,
    autoVerified: false,
    customerContacts: 1,
    ownershipTransfers: 0,
    escalated: false,
    reopened: false,
    events: [],
  }
  log(c, s.clock, 'customer', `Reported: ${ISSUE_LABEL[issue]}${detail ? ` — “${detail}”` : ''}.`)

  const verified =
    issue === 'late' &&
    order.status === 'on_the_way' &&
    order.delayMin >= AUTO_VOUCHER.minDelayMin &&
    courier !== undefined &&
    courier.lastPingSec < 60

  if (verified) {
    c.autoVerified = true
    c.status = 'voucher_offered'
    c.voucherOffer = AUTO_VOUCHER.amount
    log(
      c,
      s.clock,
      'system',
      `Checked live courier data: ${courier.name} pinged ${courier.lastPingSec} s ago, ${order.delayMin} min behind the original ETA. Delay verified.`,
    )
    log(c, s.clock, 'system', `Offered a ${money(AUTO_VOUCHER.amount)} voucher automatically (verified delay over ${AUTO_VOUCHER.minDelayMin} min).`)
  } else {
    c.ownerId = s.currentAgentId
    if (issue === 'late') {
      log(c, s.clock, 'system', 'Live courier data could not verify the delay automatically.')
    }
    log(
      c,
      s.clock,
      'system',
      `Case created and assigned to ${agentName(s, c.ownerId)} as the single owner. Order, courier data and the customer’s report are attached, so the customer will not be asked to repeat them.`,
    )
  }
  s.cases.unshift(c)
  s.ui.customer = { name: 'case', caseId: c.id }
}

function voucherChoice(s: DemoState, caseId: string, accept: boolean) {
  tick(s, 1)
  mutateCase(s, caseId, (c) => {
    if (c.status !== 'voucher_offered') return
    if (accept) {
      c.status = 'closed'
      c.closedAt = s.clock
      c.resolution = { kind: 'voucher', amount: c.voucherOffer ?? 0, fault: 'none', note: 'Verified delay, voucher accepted.' }
      log(c, s.clock, 'customer', `Accepted the ${money(c.voucherOffer ?? 0)} voucher.`)
      log(c, s.clock, 'system', 'Case closed without an agent.')
    } else {
      c.status = 'open'
      c.ownerId = s.currentAgentId
      log(c, s.clock, 'customer', 'Declined the voucher and asked for a person.')
      log(c, s.clock, 'system', `Assigned to ${agentName(s, c.ownerId)} with the live courier data already attached.`)
    }
  })
}

function customerRespond(s: DemoState, caseId: string, accept: boolean) {
  tick(s, 2)
  mutateCase(s, caseId, (c) => {
    if (c.status !== 'resolved') return
    if (accept) {
      c.status = 'closed'
      c.closedAt = s.clock
      log(c, s.clock, 'customer', 'Accepted the outcome.')
    } else {
      c.status = 'open'
      c.reopened = true
      c.customerContacts += 1
      log(c, s.clock, 'customer', 'Asked for a review of the outcome.')
      log(c, s.clock, 'system', `Review stays with the same owner, ${agentName(s, c.ownerId)}.`)
    }
  })
}

function ownerRequest(s: DemoState, caseId: string, party: 'merchant' | 'courier', question: string) {
  tick(s, 3)
  const c = caseById(s, caseId)
  if (!c) return
  const id = nextId(s, 'RQ')
  s.requests.push({ id, caseId, party, question, askedAt: s.clock })
  log(c, s.clock, 'owner', `Asked the ${party}: “${question}”`)
  if (party === 'courier') {
    // The courier app is not part of the prototype, so the reply is simulated.
    const order = orderById(s, c.orderId)
    const courier = order && s.couriers.find((x) => x.id === order.courierId)
    const answer = 'Bag was sealed with the merchant sticker when I picked it up. I didn’t open it.'
    const request = s.requests.find((r) => r.id === id)!
    request.answer = answer
    request.answeredAt = s.clock + 1
    log(c, s.clock + 1, 'courier', `${courier?.name ?? 'Courier'} replied: “${answer}”`, true)
  } else {
    c.status = 'awaiting_info'
  }
}

function merchantAnswer(s: DemoState, requestId: string, answer: string) {
  tick(s, 4)
  const r = s.requests.find((x) => x.id === requestId)
  if (!r || r.answer) return
  r.answer = answer
  r.answeredAt = s.clock
  mutateCase(s, r.caseId, (c) => {
    log(c, s.clock, 'merchant', `Replied: “${answer}”`, true)
    const stillWaiting = s.requests.some((x) => x.caseId === c.id && x.party === 'merchant' && !x.answer)
    if (c.status === 'awaiting_info' && !stillWaiting) c.status = 'open'
  })
}

function ownerConsult(s: DemoState, caseId: string, note: string) {
  tick(s, 3)
  mutateCase(s, caseId, (c) => {
    c.escalated = true
    log(c, s.clock, 'owner', `Asked Specialist Review for input: “${note}”. Ownership stays with ${agentName(s, c.ownerId)}.`, true)
    // Simulated specialist reply.
    log(c, s.clock + 4, 'specialist', 'Recommendation returned to the case owner: the evidence supports a refund for the missing item.', true)
    c.status = 'open'
  })
  tick(s, 4)
}

function ownerResolve(s: DemoState, caseId: string, resolution: Resolution) {
  tick(s, 3)
  const c = caseById(s, caseId)
  const order = c && orderById(s, c.orderId)
  if (!c || !order) return
  c.resolution = resolution
  c.status = 'resolved'
  const what =
    resolution.kind === 'refund'
      ? `Refund ${money(resolution.amount)} to the customer`
      : resolution.kind === 'voucher'
        ? `${money(resolution.amount)} voucher to the customer`
        : 'No compensation'
  log(c, s.clock, 'owner', `${what}. ${resolution.note}`.trim())
  log(c, s.clock, 'owner', `Responsible party recorded: ${resolution.fault}.`, true)

  if (resolution.kind === 'refund' && resolution.fault === 'merchant' && resolution.amount > 0) {
    const merchant = merchantOf(s, order)
    const breakdown = offerBreakdown(s, order)
    s.adjustments.unshift({
      id: nextId(s, 'ADJ'),
      caseId: c.id,
      orderId: order.id,
      merchantId: merchant.id,
      amount: round2(resolution.amount),
      reason: `Customer reported: ${ISSUE_LABEL[c.type]}. Case owner ${agentName(s, c.ownerId)} found the merchant responsible.`,
      lines: [
        { label: 'Refund to customer, deducted from your payout', amount: -resolution.amount },
        { label: `Uber Eats fee on this order (unchanged, ${money(breakdown.fee)})`, amount: 0 },
      ],
      createdAt: s.clock,
      respondBy: ORDER_DATE_PLUS_30,
      decisionDueBy: DAY_SEVEN,
      status: 'open',
    })
    log(c, s.clock, 'system', `${merchant.name} notified today with the reason and a challenge route.`, true)
  }
}

function merchantChallenge(s: DemoState, adjustmentId: string, response: string) {
  tick(s, 6)
  const a = s.adjustments.find((x) => x.id === adjustmentId)
  if (!a || a.status !== 'open') return
  a.status = 'challenged'
  a.merchantResponse = response
  mutateCase(s, a.caseId, (c) => {
    c.status = 'merchant_challenge'
    log(c, s.clock, 'merchant', `Challenged the deduction: “${response}”`, true)
    log(c, s.clock, 'system', `Returned to the same owner, ${agentName(s, c.ownerId)}. Decision due by ${a.decisionDueBy}.`, true)
  })
}

function ownerDecide(s: DemoState, adjustmentId: string, decision: 'upheld' | 'reversed', note: string) {
  tick(s, 5)
  const a = s.adjustments.find((x) => x.id === adjustmentId)
  if (!a || a.status !== 'challenged') return
  a.status = decision
  a.decisionNote = note
  mutateCase(s, a.caseId, (c) => {
    log(
      c,
      s.clock,
      'owner',
      decision === 'reversed'
        ? `Reversed the deduction: ${money(a.amount)} returned to the merchant payout. The customer refund is unaffected. ${note}`
        : `Upheld the deduction. ${note}`,
      true,
    )
    // If the customer has not yet answered, the case goes back to waiting for them.
    c.status = c.closedAt !== undefined ? 'closed' : 'resolved'
  })
}

function apply(s: DemoState, action: Action) {
  switch (action.type) {
    case 'ui/role':
      s.ui.role = action.role
      break
    case 'ui/merchant':
      s.ui.merchant = action.screen
      break
    case 'ui/customer':
      s.ui.customer = action.screen
      break
    case 'ui/support':
      s.ui.support = action.screen
      break
    case 'ui/toggleTags':
      s.ui.showProposalTags = !s.ui.showProposalTags
      break
    case 'ui/toggleGuide':
      s.ui.guideOpen = !s.ui.guideOpen
      break
    case 'demo/go':
      navigate(s, action.stepId)
      break
    case 'sim':
      simulate(s, action.simulation)
      break
    case 'forecast/plan':
      s.forecast.plan = action.plan
      tick(s, 2)
      break
    case 'order/accept': {
      const order = orderById(s, action.orderId)
      if (order?.status !== 'offered') break
      order.status = 'preparing'
      order.payoutShownAtAcceptance = offerBreakdown(s, order).net
      tick(s, 1)
      break
    }
    case 'order/decline': {
      const order = orderById(s, action.orderId)
      if (order?.status === 'offered') order.status = 'declined'
      break
    }
    case 'customer/report':
      report(s, action.orderId, action.issue, action.detail)
      break
    case 'customer/voucher':
      voucherChoice(s, action.caseId, action.accept)
      break
    case 'customer/respond':
      customerRespond(s, action.caseId, action.accept)
      break
    case 'owner/request':
      ownerRequest(s, action.caseId, action.party, action.question)
      break
    case 'owner/consult':
      ownerConsult(s, action.caseId, action.note)
      break
    case 'owner/resolve':
      ownerResolve(s, action.caseId, action.resolution)
      break
    case 'owner/decide':
      ownerDecide(s, action.adjustmentId, action.decision, action.note)
      break
    case 'merchant/answer':
      merchantAnswer(s, action.requestId, action.answer)
      break
    case 'merchant/challenge':
      merchantChallenge(s, action.adjustmentId, action.response)
      break
  }
}

export function reducer(state: DemoState, action: Action): DemoState {
  if (action.type === 'reset') {
    const fresh = createSeed()
    fresh.ui.showProposalTags = state.ui.showProposalTags
    return fresh
  }
  const next = structuredClone(state)
  apply(next, action)
  return next
}
