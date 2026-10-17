import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, LoaderCircle, RefreshCw, RotateCcw, Workflow } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useApp } from '@/state/store'
import { importedSapOrders, importSapOrders } from '@/sap/importedOrders'
import { hasSapApiKey } from '@/sap/client'
import { DataSheet } from './DataSheet'

const menuItem = 'flex cursor-default select-none items-center gap-2 rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-muted-foreground'

export function TopBar() {
  const { reset, reload } = useApp()
  const [dataOpen, setDataOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const autoImportStarted = useRef(false)
  const readSapOrders = useCallback(async () => {
    setImporting(true)
    setImportError(null)
    try {
      const snapshot = await importSapOrders(AbortSignal.timeout(30_000))
      reload()
      toast.success(`Imported ${snapshot.orders.length} SAP orders. All actions stay in this browser.`)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err))
    } finally {
      setImporting(false)
    }
  }, [reload])

  useEffect(() => {
    if (!hasSapApiKey || importedSapOrders() || autoImportStarted.current) return
    autoImportStarted.current = true
    void readSapOrders()
  }, [readSapOrders])

  return (
    <header className="shrink-0 border-b bg-background px-6 py-3">
      <div className="mx-auto flex w-[1000px] max-w-full items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">OC</span>
          <div>
            <p className="font-semibold leading-tight">Order Care</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">INFOSYS 704 · Merchant app prototype · Not affiliated with Uber</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {importing && <span role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground"><LoaderCircle className="size-3.5 animate-spin" /> Reading SAP data…</span>}
          <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger asChild>
              <Button variant="outline" aria-label="Demo tools">Demo tools <ChevronDown /></Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={8} className="z-50 w-60 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg">
                <DropdownMenu.Item className={menuItem} disabled={importing} onSelect={() => { void readSapOrders() }}>
                  <RefreshCw /> Refresh SAP data
                </DropdownMenu.Item>
                <DropdownMenu.Item className={menuItem} onSelect={() => setDataOpen(true)}>
                  <Workflow /> How the data is read
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                <DropdownMenu.Item className={menuItem} onSelect={() => {
                  reset()
                  toast('Reset: every order is a new offer again')
                }}>
                  <RotateCcw /> Reset demo
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
      {importError && <p role="alert" className="mx-auto mt-2 w-[1000px] max-w-full text-xs text-destructive">{importError} Retry from Demo tools.</p>}
      <DataSheet open={dataOpen} onOpenChange={setDataOpen} />
    </header>
  )
}
