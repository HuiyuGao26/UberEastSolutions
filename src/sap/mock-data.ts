/**
 * Sample orders for an Uber Eats NZ merchant, written in the format the SAP
 * Sales Order API returns. Every person, order and number is fictional;
 * none of it is Uber or SAP data.
 */
import type { SapPricingElement, SapSalesOrder } from './types'

const pad = (n: number) => String(n).padStart(2, '0')

/** CreationDate and CreationTime for an order placed a few minutes ago. */
function placed(minutesAgo: number): Pick<SapSalesOrder, 'CreationDate' | 'CreationTime'> {
  const d = new Date(Date.now() - minutesAgo * 60_000)
  return {
    CreationDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    CreationTime: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
  }
}

function soldTo(customer: string, name: string, suburb: string): Pick<SapSalesOrder, 'SoldToParty' | '_Partner'> {
  return {
    SoldToParty: customer,
    _Partner: [{ PartnerFunction: 'AG', Customer: customer, BusinessPartnerName1: name, CityName: suburb }],
  }
}

export function mockSalesOrders(): SapSalesOrder[] {
  return [
    {
      SalesOrder: '4821',
      SalesOrganization: 'NZ01',
      ...soldTo('C20417', 'Mia T.', 'Grey Lynn'),
      ...placed(2),
      TransactionCurrency: 'NZD',
      _Item: [
        { SalesOrderItem: '10', Product: 'KATSU-CHK', SalesOrderItemText: 'Chicken katsu bowl', RequestedQuantity: 2, NetAmount: 39 },
        { SalesOrderItem: '20', Product: 'FRIES-KUM', SalesOrderItemText: 'Kūmara fries', RequestedQuantity: 1, NetAmount: 6.8 },
        { SalesOrderItem: '30', Product: 'SODA-FEI', SalesOrderItemText: 'Feijoa soda', RequestedQuantity: 2, NetAmount: 10 },
      ],
    },
    {
      SalesOrder: '4820',
      SalesOrganization: 'NZ01',
      ...soldTo('C18802', 'James L.', 'Westmere'),
      ...placed(5),
      TransactionCurrency: 'NZD',
      _Item: [
        { SalesOrderItem: '10', Product: 'KATSU-TOFU', SalesOrderItemText: 'Tofu katsu bowl', RequestedQuantity: 2, NetAmount: 37 },
        { SalesOrderItem: '20', Product: 'FRIES-KUM', SalesOrderItemText: 'Kūmara fries', RequestedQuantity: 2, NetAmount: 13.6 },
      ],
    },
    {
      SalesOrder: '4819',
      SalesOrganization: 'NZ01',
      ...soldTo('C21190', 'Olivia S.', 'Freemans Bay'),
      ...placed(9),
      TransactionCurrency: 'NZD',
      _Item: [
        { SalesOrderItem: '10', Product: 'KATSU-CHK', SalesOrderItemText: 'Chicken katsu bowl', RequestedQuantity: 1, NetAmount: 19.5 },
        { SalesOrderItem: '20', Product: 'SODA-FEI', SalesOrderItemText: 'Feijoa soda', RequestedQuantity: 1, NetAmount: 5 },
      ],
    },
    {
      SalesOrder: '4818',
      SalesOrganization: 'NZ01',
      ...soldTo('C19355', 'Rangi H.', 'Herne Bay'),
      ...placed(14),
      TransactionCurrency: 'NZD',
      _Item: [{ SalesOrderItem: '10', Product: 'BOWL-SAL', SalesOrderItemText: 'Teriyaki salmon bowl', RequestedQuantity: 1, NetAmount: 22 }],
    },
  ]
}

/** A price condition: the item at menu price. */
function price(SalesOrder: string, SalesOrderItem: string, amount: number): SapPricingElement {
  return {
    SalesOrder,
    SalesOrderItem,
    PricingProcedureStep: '20',
    ConditionType: 'PPR0',
    PriceElementDescription: 'Price',
    ConditionClass: 'B',
    ConditionAmount: amount,
    ConditionInactiveReason: null,
    ConditionIsForStatistics: null,
  }
}

/** A discount condition: a promotion the merchant funds. "Z" marks a custom condition type. */
function promotion(SalesOrder: string, SalesOrderItem: string, amount: number): SapPricingElement {
  return {
    SalesOrder,
    SalesOrderItem,
    PricingProcedureStep: '110',
    ConditionType: 'ZPR1',
    PriceElementDescription: 'Merchant promotion',
    ConditionClass: 'A',
    ConditionAmount: -amount,
    ConditionInactiveReason: null,
    ConditionIsForStatistics: null,
  }
}

/** Kūmara fries carry a 20% merchant-funded promotion. */
export const MOCK_PRICING_ELEMENTS: SapPricingElement[] = [
  price('4821', '10', 39),
  price('4821', '20', 8.5),
  promotion('4821', '20', 1.7),
  price('4821', '30', 10),
  price('4820', '10', 37),
  price('4820', '20', 17),
  promotion('4820', '20', 3.4),
  price('4819', '10', 19.5),
  price('4819', '20', 5),
  price('4818', '10', 22),
]
