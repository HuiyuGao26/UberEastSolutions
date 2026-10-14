import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Merchant app: a landscape tablet frame. */
export function TabletFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-[1000px] max-w-full rounded-[2rem] border-[14px] border-zinc-800 bg-zinc-800 shadow-2xl">
      <div className="relative flex h-[660px] max-h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-[1rem] bg-background">
        {children}
      </div>
    </div>
  )
}

/**
 * A modal that covers only the device screen, like an in-app dialog on a real
 * tablet. It must be rendered inside the frame above.
 */
export function DeviceModal({ children, labelledBy, className }: { children: ReactNode; labelledBy: string; className?: string }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 p-6 backdrop-blur-[2px] animate-in fade-in-0">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          'w-full max-w-lg rounded-2xl bg-background shadow-2xl ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95 duration-200',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
