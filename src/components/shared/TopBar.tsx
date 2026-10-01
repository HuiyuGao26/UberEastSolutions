import { Headset, ListChecks, RotateCcw, Smartphone, Tablet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { DEMO_DATE } from '@/domain/mock'
import { clockTime } from '@/domain/format'
import type { Role } from '@/domain/types'
import { cn } from '@/lib/utils'
import { useDemo, useDispatch } from '@/state/store'

const ROLES: { id: Role; label: string; sub: string; icon: typeof Tablet }[] = [
  { id: 'merchant', label: 'Merchant', sub: 'Tablet', icon: Tablet },
  { id: 'customer', label: 'Customer', sub: 'Phone', icon: Smartphone },
  { id: 'support', label: 'Support', sub: 'Console', icon: Headset },
]

export function TopBar() {
  const s = useDemo()
  const dispatch = useDispatch()

  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b bg-background px-4 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">OC</span>
          <span className="font-semibold">Order Care</span>
          <span className="text-sm text-muted-foreground">prototype for Uber Eats NZ</span>
        </div>
        <p className="text-[11px] text-muted-foreground">INFOSYS 704 group prototype · fictional data · not affiliated with Uber</p>
      </div>

      <nav className="flex rounded-lg bg-muted p-1" aria-label="Switch role">
        {ROLES.map((r) => {
          const Icon = r.icon
          const active = s.ui.role === r.id
          return (
            <button
              key={r.id}
              onClick={() => dispatch({ type: 'ui/role', role: r.id })}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                active ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={active}
            >
              <Icon className="size-4" />
              {r.label}
              <span className="hidden text-xs text-muted-foreground xl:inline">{r.sub}</span>
            </button>
          )
        })}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <div className="text-right text-xs leading-tight">
          <div className="text-muted-foreground">{DEMO_DATE}</div>
          <div className="font-mono text-sm font-semibold">{clockTime(s.clock)}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <Checkbox id="tags" checked={s.ui.showProposalTags} onCheckedChange={() => dispatch({ type: 'ui/toggleTags' })} />
          <Label htmlFor="tags" className="text-xs">Proposal tags</Label>
        </div>
        <Button variant={s.ui.guideOpen ? 'secondary' : 'outline'} size="sm" onClick={() => dispatch({ type: 'ui/toggleGuide' })}>
          <ListChecks /> Demo guide
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            dispatch({ type: 'reset' })
            toast('Demo reset to 5:40 pm')
          }}
        >
          <RotateCcw /> Reset
        </Button>
      </div>
    </header>
  )
}
