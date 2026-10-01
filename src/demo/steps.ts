import { adjustmentForCase, heroCase, heroOrder, requestsForCase } from '@/state/selectors'
import type { DemoState, Proposal, Role } from '@/domain/types'

/** A simulated event the guide can trigger before navigating. */
export type Simulation = 'releaseOffer' | 'courierLate' | 'delivered'

export type CaseRef = 'heroLate' | 'heroMissing'

export interface StepTarget {
  role: Role
  merchant?: 'home' | 'orders' | 'payouts' | 'requests'
  customer?: 'tracking' | { case: CaseRef }
  support?: 'queue' | 'insights' | { case: CaseRef }
  simulate?: Simulation
}

export interface DemoStep {
  id: string
  title: string
  hint: string
  proposals: Proposal[]
  target: StepTarget
  done: (s: DemoState) => boolean
}

const heroMissingRequest = (s: DemoState) => {
  const c = heroCase(s, 'missing_item')
  return c ? requestsForCase(s, c.id).find((r) => r.party === 'merchant') : undefined
}

export const STEPS: DemoStep[] = [
  {
    id: 'forecast',
    title: 'Merchant plans for tonight’s peak',
    hint: 'On the merchant tablet, review the peak forecast and confirm a staffing and prep plan.',
    proposals: ['julia'],
    target: { role: 'merchant', merchant: 'home' },
    done: (s) => Boolean(s.forecast.plan),
  },
  {
    id: 'offer',
    title: 'Merchant accepts an order after seeing the net payout',
    hint: 'A new order arrives. Check the expected payout and fee basis, then accept it.',
    proposals: ['huiyu'],
    target: { role: 'merchant', merchant: 'home', simulate: 'releaseOffer' },
    done: (s) => !['scheduled', 'offered'].includes(heroOrder(s).status),
  },
  {
    id: 'late',
    title: 'Courier runs late; the customer asks for help',
    hint: 'On the customer phone, tap “Get help” and report that the order is late.',
    proposals: ['manu'],
    target: { role: 'customer', customer: 'tracking', simulate: 'courierLate' },
    done: (s) => Boolean(heroCase(s, 'late')),
  },
  {
    id: 'voucher',
    title: 'System verifies the delay with live courier data',
    hint: 'The delay is verified automatically, so a voucher is offered without waiting for an agent. Accept it, or ask for a person.',
    proposals: ['manu'],
    target: { role: 'customer', customer: { case: 'heroLate' } },
    done: (s) => {
      const c = heroCase(s, 'late')
      return Boolean(c && c.status !== 'voucher_offered')
    },
  },
  {
    id: 'missing',
    title: 'Order arrives with a drink missing',
    hint: 'The order is delivered. Report a missing item from the customer phone.',
    proposals: ['aabhas'],
    target: { role: 'customer', customer: 'tracking', simulate: 'delivered' },
    done: (s) => Boolean(heroCase(s, 'missing_item')),
  },
  {
    id: 'owner',
    title: 'One case owner checks the facts',
    hint: 'In the support console, open the case. Check live courier data, then ask the merchant what was packed.',
    proposals: ['aabhas', 'manu'],
    target: { role: 'support', support: { case: 'heroMissing' } },
    done: (s) => Boolean(heroMissingRequest(s)),
  },
  {
    id: 'reply',
    title: 'Merchant answers inside the same case',
    hint: 'On the merchant tablet, open Requests and reply. The case does not change hands.',
    proposals: ['aabhas'],
    target: { role: 'merchant', merchant: 'requests' },
    done: (s) => Boolean(heroMissingRequest(s)?.answer),
  },
  {
    id: 'resolve',
    title: 'Owner resolves within their authority',
    hint: 'Back in the console, refund the missing item and record who was at fault.',
    proposals: ['aabhas'],
    target: { role: 'support', support: { case: 'heroMissing' } },
    done: (s) => Boolean(heroCase(s, 'missing_item')?.resolution),
  },
  {
    id: 'deduction',
    title: 'Merchant sees the deduction the same day and can challenge it',
    hint: 'On the merchant tablet, open Payouts. The reason and the challenge route are there on the day of the deduction.',
    proposals: ['huiyu'],
    target: { role: 'merchant', merchant: 'payouts' },
    done: (s) => {
      const c = heroCase(s, 'missing_item')
      const a = c && adjustmentForCase(s, c.id)
      return Boolean(a && a.status !== 'open')
    },
  },
  {
    id: 'review',
    title: 'The same owner reviews the challenge',
    hint: 'The challenge returns to the original case owner, who upholds or reverses the deduction.',
    proposals: ['aabhas', 'huiyu'],
    target: { role: 'support', support: { case: 'heroMissing' } },
    done: (s) => {
      const c = heroCase(s, 'missing_item')
      const a = c && adjustmentForCase(s, c.id)
      return Boolean(a && (a.status === 'upheld' || a.status === 'reversed'))
    },
  },
  {
    id: 'insights',
    title: 'Results across all four proposals',
    hint: 'Open Insights in the console to see the KPIs each proposal is measured by.',
    proposals: ['julia', 'huiyu', 'manu', 'aabhas'],
    target: { role: 'support', support: 'insights' },
    done: (s) => s.ui.support.name === 'insights',
  },
]

export function currentStepIndex(s: DemoState): number {
  const i = STEPS.findIndex((step) => !step.done(s))
  return i === -1 ? STEPS.length : i
}
