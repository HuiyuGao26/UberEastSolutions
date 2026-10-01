import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Customer app: a phone-sized frame. */
export function PhoneFrame({ children, statusTime }: { children: ReactNode; statusTime: string }) {
  return (
    <div className="mx-auto w-[390px] max-w-full rounded-[2.75rem] border-[10px] border-zinc-900 bg-zinc-900 shadow-2xl">
      <div className="relative flex h-[780px] max-h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-[2.1rem] bg-background">
        <div className="flex h-9 shrink-0 items-center justify-between px-6 text-xs font-semibold">
          <span>{statusTime}</span>
          <span className="absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-full bg-zinc-900" />
          <span className="tracking-widest">●●●</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

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

/** Support console: a desktop browser window. */
export function BrowserFrame({ children, url }: { children: ReactNode; url: string }) {
  return (
    <div className="mx-auto w-full max-w-[1180px] overflow-hidden rounded-xl border bg-background shadow-2xl">
      <div className="flex h-9 items-center gap-2 border-b bg-muted/60 px-3">
        <span className="size-3 rounded-full bg-red-400" />
        <span className="size-3 rounded-full bg-amber-400" />
        <span className="size-3 rounded-full bg-green-400" />
        <span className="ml-3 flex-1 truncate rounded-md bg-background px-3 py-0.5 text-xs text-muted-foreground">
          {url}
        </span>
      </div>
      <div className="relative flex h-[680px] max-h-[calc(100vh-9rem)] flex-col">{children}</div>
    </div>
  )
}

export function ScreenHeader({ title, subtitle, right, className }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold leading-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

/**
 * A modal that covers only the device screen, like an in-app dialog on a real
 * tablet or phone. It must be rendered inside one of the frames above.
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
