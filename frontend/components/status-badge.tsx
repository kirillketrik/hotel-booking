import { cn } from '@/lib/utils'

type Status = 'pending' | 'approved' | 'rejected'

const statusConfig: Record<Status, { label: string; classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  approved: { label: 'Approved', classes: 'bg-green-50 text-green-700 border-green-200' },
  rejected: { label: 'Rejected', classes: 'bg-red-50 text-red-700 border-red-200' },
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const cfg = statusConfig[status]
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        cfg.classes,
        className
      )}
    >
      {cfg.label}
    </span>
  )
}
