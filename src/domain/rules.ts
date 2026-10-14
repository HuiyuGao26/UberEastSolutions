/**
 * What the wrapper adds on top of the Sales Order data. SAP holds the
 * order, its items, prices and discounts; it has no marketplace fee, so
 * the fee and the expected payout are worked out here.
 */
import { round2 } from './format'
import type { Decision, Deduction, Order, PayoutBreakdown } from './types'

/** Illustrative marketplace fee rate, not an Uber figure. */
export const FEE_RATE = 0.3

/** Uber's published rule: a deduction can be challenged within 30 days of the order date. */
export const CHALLENGE_WINDOW_DAYS = 30

/** Proposed in Gao's A2-D1: an outcome within seven calendar days of the deduction date. */
export const OUTCOME_DUE_DAYS = 7

function addDays(iso: string, days: number): Date {
  const date = new Date(iso)
  date.setDate(date.getDate() + days)
  return date
}

/** The merchant's acceptance of the order a deduction was made against, if there is one. */
export function acceptanceFor(deduction: Deduction, decisions: Decision[]): Decision | undefined {
  return decisions.find((d) => d.accepted && deduction.reference.kind === 'order' && d.order.id === deduction.reference.id)
}

/** The last day to challenge a deduction on this order. */
export function challengeDeadline(order: Order): Date {
  return addDays(order.placedAt, CHALLENGE_WINDOW_DAYS)
}

/** The day by which the merchant should have an outcome. */
export function outcomeDue(deduction: Deduction): Date {
  return addDays(deduction.createdAt, OUTCOME_DUE_DAYS)
}

/**
 * Whether the deduction can still be challenged. When the order is not
 * known, the deduction date stands in for the order date: the order is at
 * least that old, so a deduction past the window is certainly too late.
 */
export function canChallenge(deduction: Deduction, order: Order | undefined, now = new Date()): boolean {
  return now <= addDays(order?.placedAt ?? deduction.createdAt, CHALLENGE_WINDOW_DAYS)
}

/**
 * Expected net payout shown on the order offer (Gao, A2-D1 Release 1).
 * For merchant-funded item promotions the fee is calculated on the
 * discounted price (Merchant Service Terms NZ §6.2(b)(ii)).
 */
export function payoutBreakdown(order: Order): PayoutBreakdown {
  const listTotal = order.lines.reduce((sum, line) => sum + line.listAmount, 0)
  const promo = order.lines.reduce((sum, line) => sum + line.promoAmount, 0)
  const feeBasis = listTotal - promo
  const fee = feeBasis * FEE_RATE
  return {
    listTotal: round2(listTotal),
    promo: round2(promo),
    feeBasis: round2(feeBasis),
    fee: round2(fee),
    net: round2(feeBasis - fee),
    feeRate: FEE_RATE,
  }
}
