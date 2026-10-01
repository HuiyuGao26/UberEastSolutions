import { ILLUSTRATIVE_BASELINE } from '@/domain/mock'
import { median, payoutBreakdown } from '@/domain/format'
import type { Adjustment, Case, DemoState, InfoRequest, Merchant, Order } from '@/domain/types'

export function currentMerchant(s: DemoState): Merchant {
  return s.merchants.find((m) => m.id === s.merchantId)!
}

export function merchantOf(s: DemoState, order: Order): Merchant {
  return s.merchants.find((m) => m.id === order.merchantId)!
}

export function orderById(s: DemoState, id: string): Order | undefined {
  return s.orders.find((o) => o.id === id)
}

export function heroOrder(s: DemoState): Order {
  return orderById(s, s.heroOrderId)!
}

export function caseById(s: DemoState, id: string | undefined): Case | undefined {
  return id ? s.cases.find((c) => c.id === id) : undefined
}

export function heroCase(s: DemoState, type: Case['type']): Case | undefined {
  return s.cases.find((c) => c.orderId === s.heroOrderId && c.type === type)
}

export function agentName(s: DemoState, id: string | undefined): string {
  return s.agents.find((a) => a.id === id)?.name ?? 'Unassigned'
}

export function currentAgent(s: DemoState) {
  return s.agents.find((a) => a.id === s.currentAgentId)!
}

/** Orders the merchant tablet can see (scheduled ones are not released yet). */
export function merchantOrders(s: DemoState): Order[] {
  return s.orders
    .filter((o) => o.merchantId === s.merchantId && o.status !== 'scheduled')
    .sort((a, b) => b.placedAt - a.placedAt)
}

export function pendingOffer(s: DemoState): Order | undefined {
  return merchantOrders(s).find((o) => o.status === 'offered')
}

export function merchantRequests(s: DemoState): InfoRequest[] {
  return s.requests.filter((r) => {
    if (r.party !== 'merchant') return false
    const c = caseById(s, r.caseId)
    const o = c && orderById(s, c.orderId)
    return o?.merchantId === s.merchantId
  })
}

export function merchantAdjustments(s: DemoState): Adjustment[] {
  return s.adjustments.filter((a) => a.merchantId === s.merchantId)
}

export function requestsForCase(s: DemoState, caseId: string): InfoRequest[] {
  return s.requests.filter((r) => r.caseId === caseId)
}

export function adjustmentForCase(s: DemoState, caseId: string): Adjustment | undefined {
  return s.adjustments.find((a) => a.caseId === caseId)
}

export function hasSpecialistInput(c: Case): boolean {
  return c.events.some((e) => e.actor === 'specialist')
}

/** Net amount actually paid for an order after adjustments that still stand. */
export function paidForOrder(s: DemoState, order: Order): number | undefined {
  if (order.payoutShownAtAcceptance === undefined) return undefined
  const deductions = s.adjustments
    .filter((a) => a.orderId === order.id && a.status !== 'reversed')
    .reduce((sum, a) => sum + a.amount, 0)
  return order.payoutShownAtAcceptance - deductions
}

export interface Kpis {
  medianResolutionMin: number
  contactsPerCase: number
  escalatedOrReopened: number
  autoVerifiedShare: number
  peakCompletion: number
  peakOnTime: number
  mppr: number
  pepc: number
  casesCounted: number
  payoutsCounted: number
}

export function kpis(s: DemoState): Kpis {
  const closedDemo = s.cases.filter((c) => c.status === 'closed' && c.closedAt !== undefined)
  const caseRows = [
    ...s.pastCases,
    ...closedDemo.map((c) => ({
      resolutionMin: c.closedAt! - c.openedAt,
      contacts: c.customerContacts,
      escalatedOrReopened: c.escalated || c.reopened,
      autoVerified: c.autoVerified,
    })),
  ]

  const tonight = s.orders
    .filter((o) => o.merchantId === s.merchantId && o.status === 'delivered')
    .map((o) => ({ shown: o.payoutShownAtAcceptance, paid: paidForOrder(s, o) }))
    .filter((r): r is { shown: number; paid: number } => r.shown !== undefined && r.paid !== undefined)
  const payoutRows = [...s.pastPayouts, ...tonight]
  const withinTwoPercent = payoutRows.filter((r) => Math.abs(r.paid - r.shown) <= r.shown * 0.02)

  const offersSeen = s.orders.filter(
    (o) => o.merchantId === s.merchantId && !['scheduled', 'offered'].includes(o.status),
  )

  return {
    medianResolutionMin: median(caseRows.map((r) => r.resolutionMin)),
    contactsPerCase: caseRows.reduce((sum, r) => sum + r.contacts, 0) / caseRows.length,
    escalatedOrReopened: caseRows.filter((r) => r.escalatedOrReopened).length / caseRows.length,
    autoVerifiedShare: caseRows.filter((r) => r.autoVerified).length / caseRows.length,
    peakCompletion: s.peakStats.filter((p) => p.completed).length / s.peakStats.length,
    peakOnTime:
      s.peakStats.filter((p) => p.completed && p.onTime).length /
      s.peakStats.filter((p) => p.completed).length,
    mppr: withinTwoPercent.length / payoutRows.length,
    pepc: offersSeen.length ? 1 : ILLUSTRATIVE_BASELINE.pepc,
    casesCounted: caseRows.length,
    payoutsCounted: payoutRows.length,
  }
}

export function offerBreakdown(s: DemoState, order: Order) {
  return payoutBreakdown(order, merchantOf(s, order))
}
