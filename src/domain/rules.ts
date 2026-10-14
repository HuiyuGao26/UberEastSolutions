/**
 * What the wrapper adds on top of the Sales Order data. SAP holds the
 * order, its items, prices and discounts; it has no marketplace fee, so
 * the fee and the expected payout are worked out here.
 */
import { round2 } from './format'
import type { Order, PayoutBreakdown } from './types'

/** Illustrative marketplace fee rate, not an Uber figure. */
export const FEE_RATE = 0.3

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
