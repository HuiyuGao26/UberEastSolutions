import { useEffect, useRef } from 'react'
import { Check, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { STEPS, currentStepIndex } from '@/demo/steps'
import { cn } from '@/lib/utils'
import { useDemo, useDispatch } from '@/state/store'
import { PROPOSALS } from '@/domain/labels'
import { ProposalTag } from './ProposalTag'

const ROLE_LABEL = { merchant: 'Merchant tablet', customer: 'Customer phone', support: 'Support console' }

export function DemoGuide() {
  const s = useDemo()
  const dispatch = useDispatch()
  const current = currentStepIndex(s)
  const doneCount = STEPS.filter((step) => step.done(s)).length
  const listRef = useRef<HTMLOListElement>(null)

  // Keep the current step in view: centre it in the list whenever it changes.
  useEffect(() => {
    const list = listRef.current
    const item = list?.querySelector<HTMLElement>(`[data-step="${current}"]`)
    if (!list || !item) return
    const top = item.offsetTop - (list.clientHeight - item.offsetHeight) / 2
    list.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' })
  }, [current])

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Demo guide</h2>
          <Button variant="ghost" size="icon-sm" onClick={() => dispatch({ type: 'ui/toggleGuide' })} aria-label="Close guide">
            <X />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          One order, from tonight’s forecast to a challenged deduction. Each step shows whose proposal it demonstrates.
        </p>
        <Progress value={(doneCount / STEPS.length) * 100} />
        <p className="text-xs text-muted-foreground">
          {doneCount} of {STEPS.length} steps done
        </p>
      </div>

      <ol ref={listRef} className="relative flex-1 space-y-1 overflow-y-auto p-2">
        {STEPS.map((step, i) => {
          const done = step.done(s)
          const isCurrent = i === current
          return (
            <li
              key={step.id}
              data-step={i}
              className={cn('rounded-lg border border-transparent p-3', isCurrent && 'border-primary/30 bg-primary/5')}
            >
              <div className="flex gap-2.5">
                <span
                  className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                    done ? 'bg-primary text-primary-foreground' : isCurrent ? 'border-2 border-primary text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {done ? <Check className="size-3" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className={cn('text-sm leading-snug', done && !isCurrent && 'text-muted-foreground')}>{step.title}</p>
                  <div className="flex flex-wrap gap-1">
                    {step.proposals.map((p) => (
                      <ProposalTag key={p} id={p} force />
                    ))}
                  </div>
                  {isCurrent && (
                    <>
                      <p className="text-xs text-muted-foreground">{step.hint}</p>
                      <Button size="sm" onClick={() => dispatch({ type: 'demo/go', stepId: step.id })}>
                        Go to {ROLE_LABEL[step.target.role]} <ChevronRight data-icon="inline-end" />
                      </Button>
                    </>
                  )}
                  {!isCurrent && (
                    <button
                      className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                      onClick={() => dispatch({ type: 'demo/go', stepId: step.id })}
                    >
                      Open {ROLE_LABEL[step.target.role]}
                    </button>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="space-y-1.5 border-t p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Team proposals in this prototype</p>
        {Object.values(PROPOSALS).map((p) => (
          <p key={p.person}>
            <span className={cn('mr-1.5 inline-block size-2 rounded-full', p.dot)} />
            <span className="font-medium text-foreground">{p.domain} · {p.person}:</span> {p.idea}
          </p>
        ))}
      </div>
    </div>
  )
}
