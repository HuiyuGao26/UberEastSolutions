import { CASE_STATUS } from '@/domain/labels'
import type { Case } from '@/domain/types'
import { cn } from '@/lib/utils'

export function CaseStatusBadge({ status }: { status: Case['status'] }) {
  const st = CASE_STATUS[status]
  return <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap', st.className)}>{st.label}</span>
}
