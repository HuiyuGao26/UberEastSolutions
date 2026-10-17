/** SAP records imported into the local demo. Raw values remain unchanged. */
import { sapRepository } from './sapRepository'
import type { SapPricingElement, SapSalesOrder } from './types'

const KEY = 'order-care:imported-sap-orders:v1'
const IMPORT_COUNT = 2

export interface SapOrderImport {
  importedAt: string
  orders: SapSalesOrder[]
  pricing: SapPricingElement[]
}

export function importedSapOrders(): SapOrderImport | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null') as SapOrderImport | null
    return value && Array.isArray(value.orders) && Array.isArray(value.pricing) ? value : null
  } catch {
    return null
  }
}

/** All reads must succeed before replacing the saved snapshot. No SAP writes. */
export async function importSapOrders(signal?: AbortSignal): Promise<SapOrderImport> {
  const orders = (await sapRepository.listSalesOrders(signal))
    .filter((order) => order._Item.length > 0 && order._Item.every((item) => item.RequestedQuantity > 0 && item.NetAmount >= 0))
    .slice(0, IMPORT_COUNT)
  if (!orders.length) throw new Error('SAP returned no orders with usable items. The local demo has not changed.')
  const pricing = (await Promise.all(orders.flatMap((order) => order._Item.map((item) =>
    sapRepository.listItemPricingElements(order.SalesOrder, item.SalesOrderItem, signal),
  )))).flat()
  const snapshot = { importedAt: new Date().toISOString(), orders, pricing }
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot))
  } catch {
    throw new Error('The SAP records were read, but this browser could not save them. The local demo has not changed.')
  }
  return snapshot
}
