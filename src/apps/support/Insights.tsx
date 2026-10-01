import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProposalTag } from '@/components/shared/ProposalTag'
import { ILLUSTRATIVE_BASELINE as B, TARGETS } from '@/domain/mock'
import { duration, percent } from '@/domain/format'
import type { Proposal } from '@/domain/types'
import { cn } from '@/lib/utils'
import { kpis } from '@/state/selectors'
import { useDemo } from '@/state/store'

interface Metric {
  label: string
  before: string
  now: string
  target: string
  /** True when the prototype value is better than the illustrative baseline. */
  better: boolean
}

export function Insights() {
  const s = useDemo()
  const k = kpis(s)

  const groups: { proposal: Proposal; title: string; question: string; metrics: Metric[] }[] = [
    {
      proposal: 'julia',
      title: 'Peak-demand fulfilment',
      question: 'Do merchants cope better with busy nights when they know in advance?',
      metrics: [
        { label: 'Peak orders completed', before: percent(B.peakCompletion), now: percent(k.peakCompletion, 1), target: TARGETS.peakCompletion, better: k.peakCompletion > B.peakCompletion },
        { label: 'Completed peak orders on time', before: percent(B.peakOnTime), now: percent(k.peakOnTime, 1), target: TARGETS.peakOnTime, better: k.peakOnTime > B.peakOnTime },
      ],
    },
    {
      proposal: 'huiyu',
      title: 'Payout predictability',
      question: 'Do merchants get paid what they were shown before accepting?',
      metrics: [
        { label: 'Orders paid within 2% of the amount shown (MPPR)', before: percent(B.mppr), now: percent(k.mppr), target: TARGETS.mppr, better: k.mppr > B.mppr },
        { label: 'Offers showing the expected net payout (PEPC)', before: percent(B.pepc), now: percent(k.pepc), target: TARGETS.pepc, better: k.pepc > B.pepc },
      ],
    },
    {
      proposal: 'manu',
      title: 'Support speed',
      question: 'Does live courier data remove the manual checking?',
      metrics: [
        { label: 'Cases verified automatically', before: percent(B.autoVerifiedShare), now: percent(k.autoVerifiedShare), target: TARGETS.autoVerified, better: k.autoVerifiedShare > B.autoVerifiedShare },
      ],
    },
    {
      proposal: 'aabhas',
      title: 'Order-issue resolution',
      question: 'Does one owner per case cut delay, repeat contacts and escalations?',
      metrics: [
        { label: 'Median resolution time', before: duration(B.medianResolutionMin), now: duration(k.medianResolutionMin), target: TARGETS.medianResolution, better: k.medianResolutionMin < B.medianResolutionMin },
        { label: 'Customer contacts per case', before: B.contactsPerCase.toFixed(1), now: k.contactsPerCase.toFixed(2), target: TARGETS.contactsPerCase, better: k.contactsPerCase < B.contactsPerCase },
        { label: 'Cases escalated or reopened', before: percent(B.escalatedOrReopened), now: percent(k.escalatedOrReopened), target: TARGETS.escalatedOrReopened, better: k.escalatedOrReopened < B.escalatedOrReopened },
      ],
    },
  ]

  return (
    <div className="space-y-4 p-5">
      <div>
        <h2 className="text-lg font-semibold">Insights</h2>
        <p className="text-sm text-muted-foreground">
          The KPIs each team proposal is measured by. Values update as you use the demo. All numbers are illustrative demo data, not Uber figures.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {groups.map((g) => (
          <Card key={g.proposal} size="sm">
            <CardHeader>
              <CardTitle>{g.title}</CardTitle>
              <CardDescription>{g.question}</CardDescription>
              <CardAction>
                <ProposalTag id={g.proposal} force />
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              {g.metrics.map((m) => (
                <div key={m.label} className="space-y-1">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <div className="flex items-baseline gap-3">
                    <span className={cn('text-2xl font-semibold', m.better && 'text-primary')}>{m.now}</span>
                    <span className="text-xs text-muted-foreground">before: {m.before}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Target: {m.target}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        “Before” values are assumptions for the prototype (Lin’s 90% and 80% are the assumed baselines in her proposal). Case KPIs combine {k.casesCounted} cases; payout KPIs combine {k.payoutsCounted} orders.
      </p>
    </div>
  )
}
