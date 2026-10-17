/** Serves the sample data in `mock-data.ts` through the same interface as the live sandbox. */
import { round2 } from '@/domain/format'
import type { Order } from '@/domain/types'
import { MOCK_PRICING_ELEMENTS, missingItemCreditMemoRequest, mockSalesOrders } from './mock-data'
import { localRecords, type OrderRepository } from './repository'
import { importedSapOrders } from './importedOrders'
import type { SapCreditMemoRequest } from './types'

const CREDIT_MEMO_REQUESTS_KEY = 'order-care:mock-credit-memo-requests'
const FIRST_CREDIT_MEMO_REQUEST = 60000231

/** Credit memo requests created by `simulateMissingItemRefund`, kept so they survive a reload. */
function storedCreditMemoRequests(): SapCreditMemoRequest[] {
  try {
    return JSON.parse(localStorage.getItem(CREDIT_MEMO_REQUESTS_KEY) ?? '[]') as SapCreditMemoRequest[]
  } catch {
    // Storage can be unavailable (private window); start empty.
    return []
  }
}

function storeCreditMemoRequests(requests: SapCreditMemoRequest[]) {
  try {
    localStorage.setItem(CREDIT_MEMO_REQUESTS_KEY, JSON.stringify(requests))
  } catch {
    // Ignore: the app still works without persistence.
  }
}

/**
 * Plays the part of the customer and of Uber's support: the customer
 * reports one missing item on the order, is refunded, and the refund is
 * recorded as a credit memo request against the order. The cheapest item
 * on the order is the one reported.
 */
export function simulateMissingItemRefund(order: Order): SapCreditMemoRequest {
  const existing = storedCreditMemoRequests()
  // One simulated report per order, including clicks before React updates the button.
  const previous = existing.find((request) => request.ReferenceSDDocumentCategory === 'C' && request.ReferenceSDDocument === order.id)
  if (previous) return previous
  const unitValue = (line: Order['lines'][number]) => (line.listAmount - line.promoAmount) / line.qty
  const line = order.lines.reduce((cheapest, l) => (unitValue(l) < unitValue(cheapest) ? l : cheapest))
  const request = missingItemCreditMemoRequest(String(FIRST_CREDIT_MEMO_REQUEST + existing.length), order.id, order.currency, {
    text: line.name,
    amount: round2(unitValue(line)),
  })
  storeCreditMemoRequests([request, ...existing])
  return request
}

const records = localRecords('sample')

export const mockRepository: OrderRepository = {
  source: 'sample',
  merchant: { name: 'Kōwhai Kitchen', detail: 'Ponsonby · Open' },
  requests: [
    { label: 'Orders, items and customers', request: 'mockSalesOrders() + original SAP SalesOrder records saved by “Import SAP orders”' },
    { label: 'Prices and discounts of one item', request: 'MOCK_PRICING_ELEMENTS + imported SAP _ItemPricingElement records' },
    { label: 'Customer refunds (deductions)', request: 'Created by “Simulate: customer reports a missing item”, kept in this browser' },
  ],

  async listSalesOrders() {
    return [...mockSalesOrders(), ...(importedSapOrders()?.orders ?? [])]
  },

  async listItemPricingElements(salesOrder, salesOrderItem) {
    return [...MOCK_PRICING_ELEMENTS, ...(importedSapOrders()?.pricing ?? [])]
      .filter((e) => e.SalesOrder === salesOrder && e.SalesOrderItem === salesOrderItem)
  },

  async listCreditMemoRequests() {
    return storedCreditMemoRequests()
  },

  ...records,
  clear() {
    records.clear()
    storeCreditMemoRequests([])
  },
}
