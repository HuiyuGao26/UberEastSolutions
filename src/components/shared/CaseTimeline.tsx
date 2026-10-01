import { Bot, Bike, Headset, Scale, Store, User } from 'lucide-react'
import { clockTime } from '@/domain/format'
import type { Actor, CaseEvent } from '@/domain/types'
import { cn } from '@/lib/utils'

const ACTOR: Record<Actor, { label: string; icon: typeof User; className: string }> = {
  customer: { label: 'Customer', icon: User, className: 'bg-zinc-100 text-zinc-700' },
  system: { label: 'System', icon: Bot, className: 'bg-sky-100 text-sky-700' },
  owner: { label: 'Case owner', icon: Headset, className: 'bg-rose-100 text-rose-700' },
  merchant: { label: 'Merchant', icon: Store, className: 'bg-amber-100 text-amber-800' },
  courier: { label: 'Courier', icon: Bike, className: 'bg-emerald-100 text-emerald-700' },
  specialist: { label: 'Specialist', icon: Scale, className: 'bg-violet-100 text-violet-700' },
}

export function CaseTimeline({ events, compact }: { events: CaseEvent[]; compact?: boolean }) {
  return (
    <ol className="space-y-3">
      {events.map((e, i) => {
        const a = ACTOR[e.actor]
        const Icon = a.icon
        return (
          <li key={i} className="flex gap-2.5">
            <span className={cn('mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full', a.className)}>
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{a.label}</span>
                <span>{clockTime(e.at)}</span>
              </div>
              <p className={cn('text-sm leading-snug', compact && 'text-[13px]')}>{e.text}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
