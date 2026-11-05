import type { IssueStatus } from '@/lib/orders/issues'

export const istDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata',
  })

export const STATUS_CHIP: Record<IssueStatus, string> = {
  requested: 'bg-amber-50 text-amber-800 border-amber-300',
  approved: 'bg-primary text-white border-primary',
  resolved: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-error/10 text-error border-error/30',
}
