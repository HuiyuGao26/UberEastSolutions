/**
 * The app's wrapper around the SAP APIs. Screens only talk to this
 * interface, which combines local examples with imported SAP records.
 */
import type { Challenge, Decision } from '@/domain/types'
import type { SapCreditMemoRequest, SapPricingElement, SapSalesOrder } from './types'

export interface OrderRepository {
  readonly merchant: { name: string; detail: string }
  /** The requests behind the read methods, for the "How the data is read" panel. */
  readonly requests: { label: string; request: string }[]

  /** Sales Order API: newest sales orders with their items and partners. */
  listSalesOrders(signal?: AbortSignal): Promise<SapSalesOrder[]>
  /** Sales Order API: price and discount conditions of one order item. */
  listItemPricingElements(salesOrder: string, salesOrderItem: string, signal?: AbortSignal): Promise<SapPricingElement[]>
  /** Local simulated deductions, in the Credit Memo Request format. */
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
 * What the merchant does is kept in the browser. The
 * prototype only sends GET requests, and neither API has a
 * field for "amount shown at acceptance" or for a challenge. Against a
 * company's own S/4HANA system, write-back would need suitable APIs and a backend.
 */
export function localRecords(namespace = 'sample'): LocalRecords {
  // Keep the existing namespace so earlier demo decisions and photos survive.
  const key = (name: string) => `order-care:${name}:${namespace}`
  function read<T>(name: string): T[] {
    try {
      return JSON.parse(localStorage.getItem(key(name)) ?? '[]') as T[]
    } catch {
      // Storage can be unavailable (private window); start empty.
      return []
    }
  }
  function write<T>(name: string, records: T[], required = false) {
    try {
      localStorage.setItem(key(name), JSON.stringify(records))
    } catch {
      if (required) throw new Error('Your challenge could not be saved in this browser. Free up browser storage or remove the photo and try again.')
      // Ignore: the app still works without persistence.
    }
  }
  return {
    listDecisions: () => read<Decision>('decisions'),
    saveDecision: (decision) => write('decisions', [decision, ...read<Decision>('decisions').filter((d) => d.order.id !== decision.order.id)]),
    listChallenges: () => read<Challenge>('challenges'),
    saveChallenge: (challenge) =>
      write('challenges', [challenge, ...read<Challenge>('challenges').filter((c) => c.deductionId !== challenge.deductionId)], true),
    clear: () => {
      write('decisions', [])
      write('challenges', [])
    },
  }
}
