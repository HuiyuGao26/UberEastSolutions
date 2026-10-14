/** Turns Sales Order API records into what the merchant screens show. */
import type { SapPricingElement, SapSalesOrder } from '@/sap/types'
import { round2 } from './format'
import type { Order, OrderLine } from './types'

const SOLD_TO_PARTY = 'AG'

export function toOrder(so: SapSalesOrder): Order {
  const soldTo = so._Partner.find((p) => p.PartnerFunction === SOLD_TO_PARTY)
  return {
    id: so.SalesOrder,
    placedAt: `${so.CreationDate}T${so.CreationTime}`,
    customer: soldTo ? [soldTo.BusinessPartnerName1, soldTo.CityName].filter(Boolean).join(' · ') : `Customer ${so.SoldToParty}`,
    currency: so.TransactionCurrency,
    lines: so._Item.map((item) => ({
      id: item.SalesOrderItem,
      name: item.SalesOrderItemText || item.Product,
      qty: item.RequestedQuantity,
      // NetAmount is the value after discounts. Until the pricing elements
      // are read, the split into menu price and promotion is unknown.
      listAmount: item.NetAmount,
      promoAmount: 0,
    })),
  }
}

/** Splits a line into menu price and merchant promotion using its pricing elements. */
export function withPricing(line: OrderLine, elements: SapPricingElement[]): OrderLine {
  // Statistical and inactive conditions (such as internal cost) do not affect the net value.
  const prices = elements.filter((e) => e.ConditionClass === 'B' && !e.ConditionIsForStatistics && !e.ConditionInactiveReason)
  const net = line.listAmount - line.promoAmount
  const list = prices.reduce((sum, e) => sum + e.ConditionAmount, 0)
  // A list price at or below the net value means there is no promotion to show.
  return list > net ? { ...line, listAmount: round2(list), promoAmount: round2(list - net) } : line
}
