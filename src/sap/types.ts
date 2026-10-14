/**
 * The parts of two SAP OData V4 APIs that this app reads: Sales Order
 * (CE_SALESORDER_0001) and Credit Memo Request (CE_CREDITMEMOREQUEST_0001).
 * Field names and types follow the APIs' metadata, so the mock data and the
 * live sandbox return the same shapes.
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

export interface SapCreditMemoRequestItem {
  CreditMemoRequestItem: string
  CreditMemoRequestItemText: string
  RequestedQuantity: number
  NetAmount: number
}

/** A request to credit a customer, for example after a complaint about an order. */
export interface SapCreditMemoRequest {
  CreditMemoRequest: string
  CreationDate: string
  CreationTime: string
  TotalNetAmount: number
  TransactionCurrency: string
  /** Order reason code. The API returns only the code; its text is configured per SAP system. */
  SDDocumentReason: string
  /** The document being credited. */
  ReferenceSDDocument: string
  /** "C" is a sales order, "M" an invoice, "H" a return. */
  ReferenceSDDocumentCategory: string
  _Item: SapCreditMemoRequestItem[]
}
