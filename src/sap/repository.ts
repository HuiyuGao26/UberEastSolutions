/**
 * The app's wrapper around the SAP Sales Order API. Screens only talk to
 * this interface, so the sample data and the live SAP sandbox can be
 * swapped without touching them.
 */
import type { Decision, Source } from '@/domain/types'
import type { SapPricingElement, SapSalesOrder } from './types'

export interface OrderRepository {
  readonly source: Source
  readonly merchant: { name: string; detail: string }
  /** The requests behind the two read methods, for the "How the data is read" panel. */
  readonly requests: { label: string; request: string }[]

  /** Newest sales orders with their items and partners. */
  listSalesOrders(signal?: AbortSignal): Promise<SapSalesOrder[]>
  /** Price and discount conditions of one order item. */
  listItemPricingElements(salesOrder: string, salesOrderItem: string, signal?: AbortSignal): Promise<SapPricingElement[]>

  /** The merchant's accept and decline decisions. */
  listDecisions(): Decision[]
  saveDecision(decision: Decision): void
  clearDecisions(): void
}

/**
 * Decisions are kept in the browser for both repositories. The Sales Order
 * API has no field for "amount shown at acceptance", and the sandbox only
 * allows GET (writes return HTTP 405). Against a writable S/4HANA system,
 * saveDecision would update the sales order instead.
 */
export function localDecisions(source: Source): Pick<OrderRepository, 'listDecisions' | 'saveDecision' | 'clearDecisions'> {
  const key = `order-care:decisions:${source}`
  const read = (): Decision[] => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? '[]') as Decision[]
    } catch {
      // Storage can be unavailable (private window); start with no decisions.
      return []
    }
  }
  const write = (decisions: Decision[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(decisions))
    } catch {
      // Ignore: the app still works without persistence.
    }
  }
  return {
    listDecisions: read,
    saveDecision: (decision) => write([decision, ...read().filter((d) => d.order.id !== decision.order.id)]),
    clearDecisions: () => write([]),
  }
}
