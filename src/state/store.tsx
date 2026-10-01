import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react'
import { createSeed } from '@/domain/mock'
import type { DemoState } from '@/domain/types'
import { reducer, type Action } from './reducer'

const STORAGE_KEY = 'order-care-demo-v1'

function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as DemoState
  } catch {
    // Storage can be unavailable (private window); fall back to the seed.
  }
  return createSeed()
}

const StateContext = createContext<DemoState | null>(null)
const DispatchContext = createContext<Dispatch<Action> | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Ignore: the demo still works without persistence.
    }
  }, [state])

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  )
}

export function useDemo(): DemoState {
  const value = useContext(StateContext)
  if (!value) throw new Error('useDemo must be used inside DemoProvider')
  return value
}

export function useDispatch(): Dispatch<Action> {
  const value = useContext(DispatchContext)
  if (!value) throw new Error('useDispatch must be used inside DemoProvider')
  return value
}
