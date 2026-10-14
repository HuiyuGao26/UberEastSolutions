/**
 * The app's wrapper around the SAP APIs. Screens only talk to this
 * interface, so the sample data and the live SAP sandbox can be swapped
 * without touching them.
 */
import type { Challenge, Decision, Source } from '@/domain/types'
import type { SapCreditMemoRequest, SapPricingElement, SapSalesOrder } from './types'

export interface OrderRepository {
  readonly source: Source
  readonly merchant: { name: string; detail: string }
  /** The requests behind the read methods, for the "How the data is read" panel. */
  readonly requests: { label: string; request: string }[]

  /** Sales Order API: newest sales orders with their items and partners. */
  listSalesOrders(signal?: AbortSignal): Promise<SapSalesOrder[]>
  /** Sales Order API: price and discount conditions of one order item. */
  listItemPricingElements(salesOrder: string, salesOrderItem: string, signal?: AbortSignal): Promise<SapPricingElement[]>
  /** Credit Memo Request API: newest customer credits with their items. */
  listCreditMemoRequests(signal?: AbortSignal): Promise<SapCreditMemoRequest[]>

  /** The merchant's accept and decline decisions. */
  listDecisions(): Decision[]
  saveDecision(decision: Decision): void
  /** The merchant's challenges to deductions. */
  listChallenges(): Challenge[]
  saveChallenge(challenge: Challenge): void
  /** Forgets everything the merchant did. */
  clear(): void
}

type LocalRecords = Pick<OrderRepository, 'listDecisions' | 'saveDecision' | 'listChallenges' | 'saveChallenge' | 'clear'>

/**
 * What the merchant does is kept in the browser for both repositories. The
 * sandbox only allows GET (writes return HTTP 405), and neither API has a
 * field for "amount shown at acceptance" or for a challenge. Against a
 * company's own S/4HANA system these would be written back instead.
 *
 * `earlierDecisions` are orders accepted before the demo starts.
 */
export function localRecords(source: Source, earlierDecisions: () => Decision[] = () => []): LocalRecords {
  const key = (name: string) => `order-care:${name}:${source}`
  function read<T>(name: string): T[] {
    try {
      return JSON.parse(localStorage.getItem(key(name)) ?? '[]') as T[]
    } catch {
      // Storage can be unavailable (private window); start empty.
      return []
    }
  }
  function write<T>(name: string, records: T[]) {
    try {
      localStorage.setItem(key(name), JSON.stringify(records))
    } catch {
      // Ignore: the app still works without persistence.
    }
  }
  return {
    listDecisions: () => {
      const own = read<Decision>('decisions')
      return [...own, ...earlierDecisions().filter((d) => !own.some((o) => o.order.id === d.order.id))]
    },
    saveDecision: (decision) => write('decisions', [decision, ...read<Decision>('decisions').filter((d) => d.order.id !== decision.order.id)]),
    listChallenges: () => read<Challenge>('challenges'),
    saveChallenge: (challenge) =>
      write('challenges', [challenge, ...read<Challenge>('challenges').filter((c) => c.deductionId !== challenge.deductionId)]),
    clear: () => {
      write('decisions', [])
      write('challenges', [])
    },
  }
}
