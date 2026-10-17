/** Which repository the app reads from: the sample data or the live SAP sandbox. */
export type Source = 'sample' | 'sap'

export interface OrderLine {
  id: string
  name: string
  qty: number
  /** Line value at menu price, before the merchant's own promotion. */
  listAmount: number
  /** Merchant-funded promotion on this line, as a positive amount. */
  promoAmount: number
}

export interface Order {
  id: string
  /** Origin of the order values. All merchant actions are still local. */
  origin?: { kind: 'sap'; importedAt: string } | { kind: 'sample' }
  /** ISO date and time the order was placed. */
  placedAt: string
  customer: string
  currency: string
  lines: OrderLine[]
}

export interface PayoutBreakdown {
  listTotal: number
  promo: number
  feeBasis: number
  fee: number
  net: number
  feeRate: number
}

/** The merchant's answer to an order offer, with the order and amounts as they were shown. */
export interface Decision {
  order: Order
  accepted: boolean
  decidedAt: string
  /** The breakdown on the offer at that moment; `net` is the payout the merchant was shown. */
  shown: PayoutBreakdown
  /** Whether menu prices and promotions had loaded when the offer was answered. */
  pricingAvailable?: boolean
}

/** A customer refund on an order, taken out of the merchant's payout. */
export interface Deduction {
  id: string
  createdAt: string
  amount: number
  currency: string
  reason: string
  /** The document the refund was made against, usually the order. */
  reference: { kind: 'order' | 'invoice' | 'return' | 'document'; id: string }
  lines: { name: string; qty: number; amount: number }[]
}

/** One optional merchant photo attached to a challenge. */
export interface ChallengePhoto {
  name: string
  /** A resized image kept in this browser, not an SAP attachment. */
  dataUrl: string
}

/** The merchant's challenge to a deduction. */
export interface Challenge {
  deductionId: string
  text: string
  sentAt: string
  photo?: ChallengePhoto
}

export type Screen = 'offers' | 'decided' | 'payouts'
