/** Serves the sample data in `mock-data.ts` through the same interface as the live sandbox. */
import { toOrder, withPricing } from '@/domain/mapping'
import { payoutBreakdown } from '@/domain/rules'
import type { Decision } from '@/domain/types'
import {
  EARLIER_ACCEPTED_MINUTES_AGO,
  EARLIER_ACCEPTED_ORDER,
  MOCK_PRICING_ELEMENTS,
  mockCreditMemoRequests,
  mockSalesOrders,
} from './mock-data'
import { localRecords, type OrderRepository } from './repository'

function pricingElements(salesOrder: string, salesOrderItem: string) {
  return MOCK_PRICING_ELEMENTS.filter((e) => e.SalesOrder === salesOrder && e.SalesOrderItem === salesOrderItem)
}

/** The sample day starts with one order already accepted, so a deduction on it can be shown. */
function earlierDecisions(): Decision[] {
  const salesOrder = mockSalesOrders().find((so) => so.SalesOrder === EARLIER_ACCEPTED_ORDER)
  if (!salesOrder) return []
  const order = toOrder(salesOrder)
  const priced = { ...order, lines: order.lines.map((line) => withPricing(line, pricingElements(order.id, line.id))) }
  return [
    {
      order: priced,
      accepted: true,
      decidedAt: new Date(Date.now() - EARLIER_ACCEPTED_MINUTES_AGO * 60_000).toISOString(),
      shown: payoutBreakdown(priced),
    },
  ]
}

export const mockRepository: OrderRepository = {
  source: 'sample',
  merchant: { name: 'Kōwhai Kitchen', detail: 'Ponsonby · Open' },
  requests: [
    { label: 'Orders, items and customers', request: 'mockSalesOrders() in src/sap/mock-data.ts' },
    { label: 'Prices and discounts of one item', request: 'MOCK_PRICING_ELEMENTS in src/sap/mock-data.ts' },
    { label: 'Customer refunds (deductions)', request: 'mockCreditMemoRequests() in src/sap/mock-data.ts' },
  ],

  async listSalesOrders() {
    return mockSalesOrders()
  },

  async listItemPricingElements(salesOrder, salesOrderItem) {
    return pricingElements(salesOrder, salesOrderItem)
  },

  async listCreditMemoRequests() {
    return mockCreditMemoRequests()
  },

  ...localRecords('sample', earlierDecisions),
}
