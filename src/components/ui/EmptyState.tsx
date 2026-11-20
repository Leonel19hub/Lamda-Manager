import React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps extends React.ComponentPropsWithRef<'div'> {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

/**
 * EmptyState primitive for catalogs, lists, and tables with no data.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center select-none',
        className
      )}
      {...props}
    >
      <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-outline mb-3.5 shrink-0">
        <Icon className="w-7 h-7" aria-hidden="true" />
      </div>
      <h4 className="text-base font-semibold text-on-surface leading-tight">
        {title}
      </h4>
      {description && (
        <p className="text-xs text-outline mt-1.5 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4 shrink-0">{action}</div>}
    </div>
  )
}

EmptyState.displayName = 'EmptyState'
