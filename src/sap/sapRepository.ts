/** Reads from the live SAP Business Accelerator Hub sandbox. */
import { SERVICES, getJson, odataUrl, type ODataList } from './client'
import { localDecisions, type OrderRepository } from './repository'
import type { SapPricingElement, SapSalesOrder } from './types'

const ORDER_COUNT = 8

const ORDER_QUERY = {
  $top: ORDER_COUNT,
  $orderby: 'CreationDate desc,SalesOrder desc',
  $select: 'SalesOrder,SalesOrganization,SoldToParty,CreationDate,CreationTime,TransactionCurrency',
  $expand:
    '_Item($select=SalesOrderItem,Product,SalesOrderItemText,RequestedQuantity,NetAmount),' +
    '_Partner($select=PartnerFunction,Customer,BusinessPartnerName1,CityName)',
}

const PRICING_QUERY = {
  $select:
    'SalesOrder,SalesOrderItem,PricingProcedureStep,ConditionType,PriceElementDescription,ConditionClass,ConditionAmount,ConditionInactiveReason,ConditionIsForStatistics',
}

// SAP allows pricing elements to be read for one order item per request.
function pricingPath(salesOrder: string, salesOrderItem: string): string {
  return `SalesOrderItem(SalesOrder='${salesOrder}',SalesOrderItem='${salesOrderItem}')/_ItemPricingElement`
}

export const sapRepository: OrderRepository = {
  source: 'sap',
  merchant: { name: 'SAP sandbox company', detail: 'S/4HANA Cloud demo data' },
  requests: [
    { label: 'Orders, items and customers', request: `GET ${odataUrl(SERVICES.salesOrder, 'SalesOrder', ORDER_QUERY)}` },
    { label: 'Prices and discounts of one item', request: `GET ${odataUrl(SERVICES.salesOrder, pricingPath('{order}', '{item}'), PRICING_QUERY)}` },
  ],

  async listSalesOrders(signal) {
    const data = await getJson<ODataList<SapSalesOrder>>(odataUrl(SERVICES.salesOrder, 'SalesOrder', ORDER_QUERY), signal)
    return data.value
  },

  async listItemPricingElements(salesOrder, salesOrderItem, signal) {
    const url = odataUrl(SERVICES.salesOrder, pricingPath(salesOrder, salesOrderItem), PRICING_QUERY)
    const data = await getJson<ODataList<SapPricingElement>>(url, signal)
    return data.value
  },

  ...localDecisions('sap'),
}
