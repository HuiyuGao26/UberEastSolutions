import type { Merchant, Minute, Order } from './types'

const nzd = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' })

export function money(value: number): string {
  return nzd.format(value)
}

export function signedMoney(value: number): string {
  return value < 0 ? `−${nzd.format(-value)}` : nzd.format(value)
}

export function clockTime(minute: Minute): string {
  const h24 = Math.floor(minute / 60) % 24
  const m = Math.round(minute % 60)
  const suffix = h24 >= 12 ? 'pm' : 'am'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

export function duration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m ? `${h} h ${m} min` : `${h} h`
}

export function percent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export interface PayoutBreakdown {
  listTotal: number
  promo: number
  feeBasis: number
  fee: number
  net: number
  feeRate: number
}

/**
 * Expected net payout shown on the order offer (Gao, A2-D1 Release 1).
 * For merchant-funded item promotions the fee is calculated on the
 * discounted price (Merchant Service Terms NZ §6.2(b)(ii)).
 */
export function payoutBreakdown(order: Order, merchant: Merchant): PayoutBreakdown {
  let listTotal = 0
  let promo = 0
  for (const item of order.items) {
    const line = item.qty * item.unitPrice
    listTotal += line
    promo += line * (item.merchantDiscount ?? 0)
  }
  const feeBasis = listTotal - promo
  const fee = feeBasis * merchant.feeRate
  return {
    listTotal: round2(listTotal),
    promo: round2(promo),
    feeBasis: round2(feeBasis),
    fee: round2(fee),
    net: round2(feeBasis - fee),
    feeRate: merchant.feeRate,
  }
}

export function itemCount(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.qty, 0)
}

export function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
