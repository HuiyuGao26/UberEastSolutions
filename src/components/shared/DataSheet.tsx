import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { dayAndTime, percent } from '@/domain/format'
import { FEE_RATE } from '@/domain/rules'
import { importedSapOrders } from '@/sap/importedOrders'
import { sapOrderReader } from '@/sap/sapRepository'
import { useApp } from '@/state/store'

/** Where each value on the merchant screens comes from in the two SAP APIs. */
const FIELD_MAP: { api: string; fields: [onScreen: string, sapField: string][] }[] = [
  {
    api: 'Sales Order API',
    fields: [
      ['Order number', 'SalesOrder'],
      ['Placed', 'CreationDate + CreationTime'],
      ['Customer', '_Partner (sold-to): BusinessPartnerName1, CityName'],
      ['Item name and quantity', '_Item: SalesOrderItemText, RequestedQuantity'],
      ['Menu price', '_ItemPricingElement where ConditionClass = B (price)'],
      ['Your promotion', 'Menu price − NetAmount (discount conditions)'],
      ['Fee basis', '_Item: NetAmount'],
    ],
  },
  {
    api: 'Credit Memo Request format (local simulation)',
    fields: [
      ['Deduction amount', 'TotalNetAmount'],
      ['Deducted on', 'CreationDate + CreationTime'],
      ['Reason', 'SDDocumentReason (a code)'],
      ['Order it was made against', 'ReferenceSDDocument'],
      ['Refunded items', '_Item: CreditMemoRequestItemText, RequestedQuantity'],
    ],
  },
]

/** Explains the SAP API wrapper: what is read, from where, and what the app adds. */
export function DataSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { repository, orders, deductions } = useApp()
  const imported = importedSapOrders()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto data-[side=right]:sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>How the data is read</SheetTitle>
          <SheetDescription>
            One demo combines three fictional food orders with original Sales Order records read from SAP (OData V4).
            Deductions use the Credit Memo Request format locally. All merchant actions are simulated in this browser.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-6">
          <section className="space-y-1.5">
            <h3 className="font-medium">Food examples and imported SAP orders</h3>
            {orders.status === 'ready' && deductions.status === 'ready' && (
              <p className="text-muted-foreground">
                {orders.value.length} orders and {deductions.value.length} locally simulated deductions loaded.
              </p>
            )}
            {orders.status === 'error' && <p className="text-destructive">{orders.message}</p>}
            {imported && (
              <p className="text-sm text-muted-foreground">
                {imported.orders.length} original SAP orders imported {dayAndTime(imported.importedAt)}, with their item pricing.
                Order IDs, dates, customers, products, quantities, amounts and currencies are unchanged. They are saved snapshots,
                not live updates or Uber Eats transactions. We present them as offers for the prototype; their SAP status is unchanged.
                Reset clears actions and keeps this snapshot.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Refresh SAP data sends GET requests for SalesOrder and each item’s _ItemPricingElement (shown below).
              The three NZD food orders are fictional. Deductions created by Simulate and all accept, decline and challenge actions are local.
            </p>
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
            <h3 className="font-medium">Live GET requests used by Refresh SAP data</h3>
            {sapOrderReader.requests.map((request) => (
              <code key={request.label} className="block rounded-md bg-muted px-2 py-1.5 font-mono text-[11px] break-all">{decodeURIComponent(request.request)}</code>
            ))}
          </section>

          <section className="space-y-1.5">
            <h3 className="font-medium">Where each value comes from</h3>
            <table className="w-full text-left text-xs">
              {FIELD_MAP.map((group) => (
                <tbody key={group.api}>
                  <tr>
                    <th colSpan={2} className="pt-2 pb-1 font-medium text-muted-foreground">
                      {group.api}
                    </th>
                  </tr>
                  {group.fields.map(([onScreen, sapField]) => (
                    <tr key={onScreen} className="border-t align-top">
                      <td className="py-1.5 pr-3 whitespace-nowrap">{onScreen}</td>
                      <td className="py-1.5 font-mono text-[11px]">{sapField}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
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
                <span className="text-foreground">Accept, decline and challenge.</span> SAP data is read through GET requests.
                Your answers, the payout you were shown, simulated deductions and your challenges are kept in this browser.
                Production write-back would need a backend and an appropriate SAP integration for each action.
              </li>
              <li>
                <span className="text-foreground">Reason texts.</span> Simulated deductions use custom codes with descriptions defined by this app.
              </li>
            </ul>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
