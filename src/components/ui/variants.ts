import { cn } from '@/lib/utils'

/* ===== Button Variants ===== */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export const buttonVariantMap: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary shadow-xs',
  secondary:
    'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80 focus-visible:ring-secondary',
  outline:
    'border border-outline/30 bg-transparent text-on-surface hover:bg-surface-container-high focus-visible:ring-primary',
  ghost:
    'bg-transparent text-on-surface hover:bg-surface-container-high focus-visible:ring-primary',
  danger:
    'bg-error text-on-error hover:bg-error/90 focus-visible:ring-error shadow-xs',
}

export const buttonSizeMap: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-xs rounded-md gap-1.5',
  md: 'h-10 px-4 text-sm rounded-lg gap-2',
  lg: 'h-12 px-6 text-base rounded-lg gap-2.5 font-medium',
}

export function getButtonClasses(options: {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  className?: string
} = {}): string {
  const {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    className,
  } = options

  return cn(
    'inline-flex items-center justify-center font-medium transition-colors select-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
    buttonVariantMap[variant],
    buttonSizeMap[size],
    isLoading && 'cursor-wait opacity-80',
    className
  )
}

/* ===== Badge Variants ===== */
export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'
export type BadgeSize = 'sm' | 'md'

export const badgeVariantMap: Record<BadgeVariant, string> = {
  success: 'bg-primary-container/20 text-on-primary-container border-primary-container/40',
  warning: 'bg-warning-container/40 text-on-warning-container border-warning/30',
  danger: 'bg-error-container/40 text-on-error-container border-error/30',
  info: 'bg-tertiary-container/30 text-on-tertiary-container border-tertiary-container/50',
  neutral: 'bg-surface-container-high text-on-surface-variant border-slate-200',
}

export const badgeSizeMap: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-2 py-0.5 rounded-full',
  md: 'text-xs px-2.5 py-1 rounded-full',
}

export const badgeDotColorMap: Record<BadgeVariant, string> = {
  success: 'bg-primary',
  warning: 'bg-warning',
  danger: 'bg-error',
  info: 'bg-tertiary',
  neutral: 'bg-outline',
}

export function getBadgeClasses(options: {
  variant?: BadgeVariant
  size?: BadgeSize
  className?: string
} = {}): string {
  const { variant = 'neutral', size = 'md', className } = options
  return cn(
    'inline-flex items-center gap-1.5 border font-semibold tracking-wide transition-colors',
    badgeVariantMap[variant],
    badgeSizeMap[size],
    className
  )
}

export function getBadgeDotClasses(variant: BadgeVariant = 'neutral'): string {
  return cn('w-1.5 h-1.5 rounded-full', badgeDotColorMap[variant])
}

/* ===== Alert Variants ===== */
export type AlertVariant = 'info' | 'success' | 'warning' | 'error'

export const alertVariantMap: Record<AlertVariant, string> = {
  info: 'bg-tertiary-container/20 text-on-surface border-tertiary-container/50',
  success: 'bg-primary-container/20 text-on-surface border-primary-container/50',
  warning: 'bg-warning-container/30 text-on-surface border-warning/30',
  error: 'bg-error-container/40 text-on-surface border-error/30',
}

export const alertIconColorMap: Record<AlertVariant, string> = {
  info: 'text-tertiary',
  success: 'text-primary',
  warning: 'text-warning',
  error: 'text-error',
}

export function getAlertClasses(options: {
  variant?: AlertVariant
  className?: string
} = {}): string {
  const { variant = 'info', className } = options
  return cn(
    'relative w-full rounded-lg border p-4 text-sm transition-all flex items-start gap-3',
    alertVariantMap[variant],
    className
  )
}

/* ===== Card Variants ===== */
export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

export const cardPaddingMap: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
}

export function getCardClasses(options: {
  padding?: CardPadding
  className?: string
} = {}): string {
  const { padding = 'md', className } = options
  return cn(
    'bg-surface-container-lowest rounded-xl border border-slate-200 shadow-xs text-on-surface',
    cardPaddingMap[padding],
    className
  )
}
