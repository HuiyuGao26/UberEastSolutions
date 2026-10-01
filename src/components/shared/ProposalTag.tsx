import { cn } from '@/lib/utils'
import { useDemo } from '@/state/store'
import { PROPOSALS } from '@/domain/labels'
import type { Proposal } from '@/domain/types'


/** Shows which team member's A2-D1 proposal a feature comes from. */
export function ProposalTag({ id, className, force }: { id: Proposal; className?: string; force?: boolean }) {
  const { ui } = useDemo()
  if (!ui.showProposalTags && !force) return null
  const p = PROPOSALS[id]
  return (
    <span
      title={`${p.domain} · ${p.person}: ${p.idea}`}
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1 rounded-full border px-2 text-[11px] font-medium whitespace-nowrap',
        p.className,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', p.dot)} />
      {p.domain} · {p.person}
    </span>
  )
}

export function ProposalTags({ ids, className }: { ids: Proposal[]; className?: string }) {
  return (
    <span className={cn('inline-flex flex-wrap gap-1', className)}>
      {ids.map((id) => (
        <ProposalTag key={id} id={id} />
      ))}
    </span>
  )
}
