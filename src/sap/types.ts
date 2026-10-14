/**
 * The parts of the SAP Sales Order API (OData V4, CE_SALESORDER_0001) that
 * this app reads. Field names and types follow the API's metadata, so the
 * mock data and the live sandbox return the same shapes.
 */

export interface SapSalesOrderItem {
  SalesOrderItem: string
  Product: string
  SalesOrderItemText: string
  RequestedQuantity: number
  /** Value of the item after discounts, before tax. */
  NetAmount: number
}

export interface SapSalesOrderPartner {
  /** "AG" is the sold-to party. */
  PartnerFunction: string
  Customer: string | null
  BusinessPartnerName1: string
  CityName: string
}

export interface SapSalesOrder {
  SalesOrder: string
  SalesOrganization: string
  SoldToParty: string
  /** Edm.Date, e.g. "2026-10-14". */
  CreationDate: string
  /** Edm.TimeOfDay, e.g. "18:22:05". */
  CreationTime: string
  TransactionCurrency: string
  _Item: SapSalesOrderItem[]
  _Partner: SapSalesOrderPartner[]
}

export interface SapPricingElement {
  SalesOrder: string
  SalesOrderItem: string
  PricingProcedureStep: string
  ConditionType: string
  PriceElementDescription: string
  /** "B" is a price, "A" a discount or surcharge, "D" a tax. Subtotal rows have none. */
  ConditionClass: string | null
  ConditionAmount: number
  ConditionInactiveReason: string | null
  ConditionIsForStatistics: boolean | null
}
