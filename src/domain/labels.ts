import type { Case, IssueType, OrderStatus, Proposal } from './types'

export const ORDER_STATUS: Record<OrderStatus, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-muted text-muted-foreground' },
  offered: { label: 'New offer', className: 'bg-amber-100 text-amber-800' },
  declined: { label: 'Declined', className: 'bg-muted text-muted-foreground' },
  preparing: { label: 'Preparing', className: 'bg-sky-100 text-sky-800' },
  on_the_way: { label: 'On the way', className: 'bg-violet-100 text-violet-800' },
  delivered: { label: 'Delivered', className: 'bg-emerald-100 text-emerald-800' },
}

export const ISSUE_LABEL: Record<IssueType, string> = {
  late: 'Late order',
  missing_item: 'Missing item',
  wrong_item: 'Wrong item',
  not_delivered: 'Not delivered',
}

export const CASE_STATUS: Record<Case['status'], { label: string; className: string }> = {
  voucher_offered: { label: 'Auto: voucher offered', className: 'bg-sky-100 text-sky-800' },
  open: { label: 'Open', className: 'bg-amber-100 text-amber-800' },
  awaiting_info: { label: 'Waiting for info', className: 'bg-zinc-100 text-zinc-700' },
  with_specialist: { label: 'Specialist input', className: 'bg-violet-100 text-violet-800' },
  resolved: { label: 'Resolved: customer to confirm', className: 'bg-emerald-50 text-emerald-800' },
  merchant_challenge: { label: 'Merchant challenge', className: 'bg-rose-100 text-rose-800' },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground' },
}

export const PROPOSALS: Record<Proposal, { person: string; domain: string; idea: string; className: string; dot: string }> = {
  julia: {
    person: 'Lin',
    domain: 'Strategic',
    idea: 'Peak-demand forecast for merchants',
    className: 'border-violet-200 bg-violet-50 text-violet-800',
    dot: 'bg-violet-500',
  },
  huiyu: {
    person: 'Gao',
    domain: 'Financial',
    idea: 'Net payout before acceptance; same-day challenge route',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
    dot: 'bg-amber-500',
  },
  manu: {
    person: 'Manu',
    domain: 'Operational',
    idea: 'Live courier data verifies issues; auto voucher',
    className: 'border-sky-200 bg-sky-50 text-sky-800',
    dot: 'bg-sky-500',
  },
  aabhas: {
    person: 'Janbandhu',
    domain: 'Organisational',
    idea: 'One accountable case owner with a shared case record',
    className: 'border-rose-200 bg-rose-50 text-rose-800',
    dot: 'bg-rose-500',
  },
}
