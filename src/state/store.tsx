import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toDeduction, toOrder } from '@/domain/mapping'
import type { Challenge, Decision, Deduction, Order, PayoutBreakdown, Screen, Source } from '@/domain/types'
import { mockRepository } from '@/sap/mockRepository'
import type { OrderRepository } from '@/sap/repository'
import { sapRepository } from '@/sap/sapRepository'

const REPOSITORIES: Record<Source, OrderRepository> = { sample: mockRepository, sap: sapRepository }
const SOURCE_KEY = 'order-care:source'

export type Loaded<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; value: T; ms: number }

interface AppStore {
  source: Source
  setSource: (source: Source) => void
  screen: Screen
  setScreen: (screen: Screen) => void
  repository: OrderRepository
  /** Everything the repository returned, including orders already decided. */
  orders: Loaded<Order[]>
  deductions: Loaded<Deduction[]>
  reload: () => void
  decisions: Decision[]
  decide: (order: Order, accepted: boolean, shown: PayoutBreakdown) => void
  challenges: Challenge[]
  challenge: (deductionId: string, text: string) => void
  reset: () => void
}

/** `?source=sap` or `?source=sample` in the address wins over the last choice. */
function initialSource(): Source {
  const fromUrl = new URLSearchParams(location.search).get('source')
  if (fromUrl === 'sap' || fromUrl === 'sample') return fromUrl
  try {
    return localStorage.getItem(SOURCE_KEY) === 'sap' ? 'sap' : 'sample'
  } catch {
    return 'sample'
  }
}

type Keyed<T> = { key: string; result: Loaded<T> } | null

/** Runs one read and stores its result under `key`, unless it was cancelled first. */
function load<T>(key: string, read: (signal: AbortSignal) => Promise<T>, store: (value: Keyed<T>) => void): () => void {
  const controller = new AbortController()
  const started = performance.now()
  read(controller.signal)
    .then((value) => store({ key, result: { status: 'ready', value, ms: Math.round(performance.now() - started) } }))
    .catch((err: unknown) => {
      if (controller.signal.aborted) return
      store({ key, result: { status: 'error', message: err instanceof Error ? err.message : String(err) } })
    })
  return () => controller.abort()
}

/** A result from another source or an earlier attempt means this read is still loading. */
function current<T>(loaded: Keyed<T>, key: string): Loaded<T> {
  return loaded?.key === key ? loaded.result : { status: 'loading' }
}

function localRecordsOf(repository: OrderRepository) {
  return { decisions: repository.listDecisions(), challenges: repository.listChallenges() }
}

const StoreContext = createContext<AppStore | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [source, setSourceState] = useState<Source>(initialSource)
  const [screen, setScreen] = useState<Screen>('offers')
  const [attempt, setAttempt] = useState(0)
  const [orders, setOrders] = useState<Keyed<Order[]>>(null)
  const [deductions, setDeductions] = useState<Keyed<Deduction[]>>(null)
  const [records, setRecords] = useState(() => ({ sample: localRecordsOf(mockRepository), sap: localRecordsOf(sapRepository) }))

  const repository = REPOSITORIES[source]
  const loadKey = `${source}:${attempt}`

  useEffect(
    () =>
      load(
        loadKey,
        // An order without items has nothing to pay out.
        async (signal) => (await repository.listSalesOrders(signal)).filter((so) => so._Item.length > 0).map(toOrder),
        setOrders,
      ),
    [repository, loadKey],
  )

  useEffect(
    () => load(loadKey, async (signal) => (await repository.listCreditMemoRequests(signal)).map(toDeduction), setDeductions),
    [repository, loadKey],
  )

  const setSource = useCallback((next: Source) => {
    setSourceState(next)
    setScreen('offers')
    try {
      localStorage.setItem(SOURCE_KEY, next)
    } catch {
      // Ignore: the choice just will not be remembered.
    }
  }, [])

  const value = useMemo<AppStore>(() => {
    const refreshRecords = () => setRecords((all) => ({ ...all, [source]: localRecordsOf(repository) }))
    return {
      source,
      setSource,
      screen,
      setScreen,
      repository,
      orders: current(orders, loadKey),
      deductions: current(deductions, loadKey),
      reload: () => setAttempt((n) => n + 1),
      decisions: records[source].decisions,
      decide: (order, accepted, shown) => {
        repository.saveDecision({ order, accepted, decidedAt: new Date().toISOString(), shown })
        refreshRecords()
      },
      challenges: records[source].challenges,
      challenge: (deductionId, text) => {
        repository.saveChallenge({ deductionId, text, sentAt: new Date().toISOString() })
        refreshRecords()
      },
      reset: () => {
        mockRepository.clear()
        sapRepository.clear()
        setRecords({ sample: localRecordsOf(mockRepository), sap: localRecordsOf(sapRepository) })
        setScreen('offers')
        setAttempt((n) => n + 1)
      },
    }
  }, [source, setSource, screen, repository, orders, deductions, loadKey, records])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useApp(): AppStore {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useApp must be used inside AppProvider')
  return value
}

/** Orders that still wait for the merchant's answer. */
export function useOffers(): Order[] {
  const { orders, decisions } = useApp()
  return useMemo(() => {
    if (orders.status !== 'ready') return []
    const decided = new Set(decisions.map((d) => d.order.id))
    return orders.value.filter((o) => !decided.has(o.id))
  }, [orders, decisions])
}
