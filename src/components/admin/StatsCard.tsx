import { cn } from '@/lib/utils'

interface Props {
  title: string
  value: string | number
  icon: string
  trend?: { value: number; label: string }
  accent?: 'primary' | 'secondary' | 'success' | 'warning'
  className?: string
}

const accentMap = {
  primary: 'text-primary bg-primary/10',
  secondary: 'text-secondary bg-secondary/10',
  success: 'text-success bg-success/10',
  warning: 'text-secondary-fixed-dim bg-secondary/10',
}

export default function StatsCard({ title, value, icon, trend, accent = 'primary', className }: Props) {
  return (
    <div className={cn('bg-surface-container-lowest rounded-xl border border-outline-variant/50 p-5 shadow-sm', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">
            {title}
          </p>
          <p className="font-headline-md text-headline-md text-on-surface">{value}</p>
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', accentMap[accent])}>
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={cn(
              'material-symbols-outlined text-[14px]',
              trend.value >= 0 ? 'text-success' : 'text-error',
            )}
          >
            {trend.value >= 0 ? 'trending_up' : 'trending_down'}
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </span>
        </div>
      )}
    </div>
  )
}
