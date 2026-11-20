import React from 'react'
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getAlertClasses, type AlertVariant } from './variants'

export interface AlertBannerProps extends React.ComponentPropsWithRef<'div'> {
  variant?: AlertVariant
  title?: string
  onDismiss?: () => void
  children?: React.ReactNode
}

const alertIconMap: Record<AlertVariant, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
}

const alertIconColorMap: Record<AlertVariant, string> = {
  info: 'text-tertiary',
  success: 'text-primary',
  warning: 'text-warning',
  error: 'text-error',
}

/**
 * Semantic AlertBanner primitive for prominent notices, warnings, and error messages.
 */
export const AlertBanner: React.FC<AlertBannerProps> = ({
  variant = 'info',
  title,
  onDismiss,
  className,
  children,
  ...props
}) => {
  const Icon = alertIconMap[variant]
  const iconColor = alertIconColorMap[variant]

  return (
    <div
      role="alert"
      className={getAlertClasses({ variant, className })}
      {...props}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        {title && (
          <h5 className="font-semibold text-on-surface leading-snug mb-0.5">
            {title}
          </h5>
        )}
        {children && (
          <div className="text-xs text-on-surface/90 leading-relaxed font-normal">
            {children}
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-1 -mr-1 -mt-1 rounded-md text-outline hover:text-on-surface hover:bg-black/5 transition-colors cursor-pointer"
          aria-label="Cerrar aviso"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

AlertBanner.displayName = 'AlertBanner'
