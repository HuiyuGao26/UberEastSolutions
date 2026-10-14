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
}

export type Screen = 'offers' | 'decided'
