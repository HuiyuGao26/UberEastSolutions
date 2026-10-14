/** Serves the sample orders in `mock-data.ts` through the same interface as the live sandbox. */
import { MOCK_PRICING_ELEMENTS, mockSalesOrders } from './mock-data'
import { localDecisions, type OrderRepository } from './repository'

export const mockRepository: OrderRepository = {
  source: 'sample',
  merchant: { name: 'Kōwhai Kitchen', detail: 'Ponsonby · Open' },
  requests: [
    { label: 'Orders, items and customers', request: 'mockSalesOrders() in src/sap/mock-data.ts' },
    { label: 'Prices and discounts of one item', request: 'MOCK_PRICING_ELEMENTS in src/sap/mock-data.ts' },
  ],

  async listSalesOrders() {
    return mockSalesOrders()
  },

  async listItemPricingElements(salesOrder, salesOrderItem) {
    return MOCK_PRICING_ELEMENTS.filter((e) => e.SalesOrder === salesOrder && e.SalesOrderItem === salesOrderItem)
  },

  ...localDecisions('sample'),
}
