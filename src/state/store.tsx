import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toOrder } from '@/domain/mapping'
import type { Decision, Order, PayoutBreakdown, Screen, Source } from '@/domain/types'
import { mockRepository } from '@/sap/mockRepository'
import type { OrderRepository } from '@/sap/repository'
import { sapRepository } from '@/sap/sapRepository'

const REPOSITORIES: Record<Source, OrderRepository> = { sample: mockRepository, sap: sapRepository }
const SOURCE_KEY = 'order-care:source'

export type Orders = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; orders: Order[]; ms: number }

interface AppStore {
  source: Source
  setSource: (source: Source) => void
  screen: Screen
  setScreen: (screen: Screen) => void
  repository: OrderRepository
  /** Everything the repository returned, including orders already decided. */
  orders: Orders
  reload: () => void
  decisions: Decision[]
  decide: (order: Order, accepted: boolean, shown: PayoutBreakdown) => void
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

const StoreContext = createContext<AppStore | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [source, setSourceState] = useState<Source>(initialSource)
  const [screen, setScreen] = useState<Screen>('offers')
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState<{ key: string; orders: Orders } | null>(null)
  const [decisions, setDecisions] = useState<Record<Source, Decision[]>>(() => ({
    sample: mockRepository.listDecisions(),
    sap: sapRepository.listDecisions(),
  }))

  const repository = REPOSITORIES[source]
  const loadKey = `${source}:${attempt}`

  useEffect(() => {
    const controller = new AbortController()
    const started = performance.now()
    repository
      .listSalesOrders(controller.signal)
      .then((salesOrders) => {
        // An order without items has nothing to pay out.
        const orders = salesOrders.filter((so) => so._Item.length > 0).map(toOrder)
        setLoaded({ key: loadKey, orders: { status: 'ready', orders, ms: Math.round(performance.now() - started) } })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setLoaded({ key: loadKey, orders: { status: 'error', message: err instanceof Error ? err.message : String(err) } })
      })
    return () => controller.abort()
  }, [repository, loadKey])

  const setSource = useCallback((next: Source) => {
    setSourceState(next)
    setScreen('offers')
    try {
      localStorage.setItem(SOURCE_KEY, next)
    } catch {
      // Ignore: the choice just will not be remembered.
    }
  }, [])

  const value = useMemo<AppStore>(
    () => ({
      source,
      setSource,
      screen,
      setScreen,
      repository,
      // A result from another source or an earlier attempt means this one is still loading.
      orders: loaded?.key === loadKey ? loaded.orders : { status: 'loading' },
      reload: () => setAttempt((n) => n + 1),
      decisions: decisions[source],
      decide: (order, accepted, shown) => {
        repository.saveDecision({ order, accepted, decidedAt: new Date().toISOString(), shown })
        setDecisions((all) => ({ ...all, [source]: repository.listDecisions() }))
      },
      reset: () => {
        mockRepository.clearDecisions()
        sapRepository.clearDecisions()
        setDecisions({ sample: [], sap: [] })
        setScreen('offers')
        setAttempt((n) => n + 1)
      },
    }),
    [source, setSource, screen, repository, loaded, loadKey, decisions],
  )

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
    return orders.orders.filter((o) => !decided.has(o.id))
  }, [orders, decisions])
}
