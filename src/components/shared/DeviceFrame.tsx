import { useEffect, useRef, type ReactNode } from 'react'
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
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const getFocusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => element.getAttribute('aria-hidden') !== 'true' && element.offsetParent !== null)

    if (!dialog.contains(document.activeElement)) getFocusable()[0]?.focus()

    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      // A photo preview can open a second, portalled dialog above this one.
      const anotherDialogIsOpen = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'))
        .some((other) => other !== dialog && other.getClientRects().length > 0)
      if (anotherDialogIsOpen) return

      const focusable = getFocusable()
      const first = focusable[0]
      const last = focusable.at(-1)
      const active = document.activeElement
      if (!first || !last) {
        event.preventDefault()
        dialog.focus()
      } else if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', keepFocusInside)
    return () => {
      document.removeEventListener('keydown', keepFocusInside)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 p-6 backdrop-blur-[2px] animate-in fade-in-0">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        ref={dialogRef}
        tabIndex={-1}
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
