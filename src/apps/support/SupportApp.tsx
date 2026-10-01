import { BarChart3, Headset, Inbox } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BrowserFrame } from '@/components/shared/DeviceFrame'
import { ProposalTag } from '@/components/shared/ProposalTag'
import { clockTime, duration } from '@/domain/format'
import { ISSUE_LABEL } from '@/domain/labels'
import type { SupportScreen } from '@/domain/types'
import { cn } from '@/lib/utils'
import { agentName, currentAgent, orderById } from '@/state/selectors'
import { useDemo, useDispatch } from '@/state/store'
import { CaseDetail } from './CaseDetail'
import { CaseStatusBadge } from './CaseStatusBadge'
import { Insights } from './Insights'




const NAV: { id: SupportScreen['name']; label: string; icon: typeof Inbox }[] = [
  { id: 'queue', label: 'Cases', icon: Inbox },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
]

export function SupportApp() {
  const s = useDemo()
  const dispatch = useDispatch()
  const agent = currentAgent(s)
  const screen = s.ui.support
  const mine = s.cases.filter((c) => c.ownerId === agent.id && c.status !== 'closed').length

  return (
    <BrowserFrame url="support.portier.internal/order-care">
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-48 shrink-0 flex-col gap-1 border-r bg-muted/40 p-3">
          <div className="mb-3 flex items-center gap-2 px-1">
            <span className="flex size-8 items-center justify-center rounded-full bg-rose-100 text-rose-700">
              <Headset className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">{agent.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{agent.team}</p>
            </div>
          </div>
          {NAV.map((n) => {
            const Icon = n.icon
            const active = screen.name === n.id || (n.id === 'queue' && screen.name === 'case')
            return (
              <button
                key={n.id}
                onClick={() => dispatch({ type: 'ui/support', screen: { name: n.id } })}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-2 text-sm',
                  active ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:bg-background/60',
                )}
              >
                <Icon className="size-4" />
                <span className="flex-1 text-left">{n.label}</span>
                {n.id === 'queue' && mine > 0 && <Badge className="h-5 min-w-5 px-1.5">{mine}</Badge>}
              </button>
            )
          })}
          <div className="mt-auto space-y-1 rounded-md border bg-background p-2 text-[11px]">
            <p className="font-medium">Your decision rights</p>
            <p className="text-muted-foreground">Refunds up to ${agent.refundLimit}, vouchers up to ${agent.voucherLimit}. Above that, ask Specialist Review; the case stays yours.</p>
            <ProposalTag id="aabhas" />
          </div>
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto">
          {screen.name === 'queue' && <Queue />}
          {screen.name === 'case' && <CaseDetail caseId={screen.caseId} />}
          {screen.name === 'insights' && <Insights />}
        </main>
      </div>
    </BrowserFrame>
  )
}

function Queue() {
  const s = useDemo()
  const dispatch = useDispatch()
  const agent = currentAgent(s)
  const rows = [...s.cases].sort((a, b) => Number(a.status === 'closed') - Number(b.status === 'closed') || b.openedAt - a.openedAt)

  return (
    <div className="space-y-3 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Cases</h2>
          <p className="text-sm text-muted-foreground">Every case has one owner from report to closure. Verified late orders are handled automatically.</p>
        </div>
        <div className="flex gap-1">
          <ProposalTag id="aabhas" />
          <ProposalTag id="manu" />
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Case</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Issue</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Opened</TableHead>
            <TableHead className="text-right">Age</TableHead>
            <TableHead className="text-right">Contacts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => {
            const order = orderById(s, c.orderId)
            const merchant = s.merchants.find((m) => m.id === order?.merchantId)
            return (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => dispatch({ type: 'ui/support', screen: { name: 'case', caseId: c.id } })}>
                <TableCell className="font-medium">{c.id}</TableCell>
                <TableCell>
                  {c.orderId}
                  <span className="block text-[11px] text-muted-foreground">{merchant?.name}</span>
                </TableCell>
                <TableCell>{ISSUE_LABEL[c.type]}</TableCell>
                <TableCell><CaseStatusBadge status={c.status} /></TableCell>
                <TableCell className={cn(c.ownerId === agent.id && 'font-medium')}>
                  {c.ownerId ? `${agentName(s, c.ownerId)}${c.ownerId === agent.id ? ' (you)' : ''}` : 'System'}
                </TableCell>
                <TableCell>{clockTime(c.openedAt)}</TableCell>
                <TableCell className="text-right">{duration((c.closedAt ?? s.clock) - c.openedAt)}</TableCell>
                <TableCell className="text-right">{c.customerContacts}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
