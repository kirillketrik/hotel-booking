import { cn } from '@/lib/utils'

interface PageShellProps {
  children: React.ReactNode
  className?: string
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <main className={cn('flex-1 pt-6 px-4 sm:px-6 lg:px-8', className)}>{children}</main>
  )
}
