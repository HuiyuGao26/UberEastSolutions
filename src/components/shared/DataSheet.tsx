import { Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { percent } from '@/domain/format'
import { FEE_RATE } from '@/domain/rules'
import { useApp } from '@/state/store'

/** Where each value on the merchant screens comes from in the Sales Order API. */
const FIELD_MAP: [onScreen: string, sapField: string][] = [
  ['Order number', 'SalesOrder'],
  ['Placed', 'CreationDate + CreationTime'],
  ['Customer', '_Partner (sold-to): BusinessPartnerName1, CityName'],
  ['Item name and quantity', '_Item: SalesOrderItemText, RequestedQuantity'],
  ['Menu price', '_ItemPricingElement where ConditionClass = B (price)'],
  ['Your promotion', 'Menu price − NetAmount (discount conditions)'],
  ['Fee basis', '_Item: NetAmount'],
]

/** Explains the SAP API wrapper: what is read, from where, and what the app adds. */
export function DataSheet() {
  const { source, repository, orders } = useApp()

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Workflow /> How the data is read
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto data-[side=right]:sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>How the data is read</SheetTitle>
          <SheetDescription>
            The screens read orders through one wrapper around the SAP Sales Order API (OData V4). Two versions of it can be switched in the top
            bar: sample data in the API’s format, and the live SAP sandbox.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-6">
          <section className="space-y-1.5">
            <h3 className="font-medium">Now reading from: {source === 'sap' ? 'SAP sandbox (live)' : 'Sample data'}</h3>
            {orders.status === 'ready' && (
              <p className="text-muted-foreground">
                {orders.orders.length} orders loaded{source === 'sap' ? ` in ${(orders.ms / 1000).toFixed(1)} s` : ''}.
                {source === 'sap' && ' These are SAP’s own demo orders, not Uber Eats orders.'}
              </p>
            )}
            {orders.status === 'error' && <p className="text-destructive">{orders.message}</p>}
            <ul className="space-y-2">
              {repository.requests.map((r) => (
                <li key={r.label}>
                  <p className="text-xs text-muted-foreground">{r.label}</p>
                  <code className="block rounded-md bg-muted px-2 py-1.5 font-mono text-[11px] break-all">{decodeURIComponent(r.request)}</code>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-medium">Where each value comes from</h3>
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3 font-medium">On screen</th>
                  <th className="py-1 font-medium">Sales Order API</th>
                </tr>
              </thead>
              <tbody>
                {FIELD_MAP.map(([onScreen, sapField]) => (
                  <tr key={onScreen} className="border-t align-top">
                    <td className="py-1.5 pr-3 whitespace-nowrap">{onScreen}</td>
                    <td className="py-1.5 font-mono text-[11px]">{sapField}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-medium">What the wrapper adds</h3>
            <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
              <li>
                <span className="text-foreground">Fee and expected payout.</span> A sales order has no marketplace fee, so the app works it out:
                fee basis × {percent(FEE_RATE)} (an illustrative rate), and payout = fee basis − fee.
              </li>
              <li>
                <span className="text-foreground">Accept and decline.</span> The sandbox only allows reading, so your answer and the payout you
                were shown are kept in this browser. With a company’s own SAP system they would be written back to the order.
              </li>
            </ul>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
