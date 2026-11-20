import React from 'react'
import {
  getBadgeClasses,
  getBadgeDotClasses,
  type BadgeVariant,
  type BadgeSize,
} from './variants'

export interface BadgeProps extends React.ComponentPropsWithRef<'span'> {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  children: React.ReactNode
}

/**
 * Semantic Badge tag primitive for statuses, stock states, and indicators.
 */
export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  dot = false,
  className,
  children,
  ...props
}) => {
  return (
    <span className={getBadgeClasses({ variant, size, className })} {...props}>
      {dot && <span className={getBadgeDotClasses(variant)} aria-hidden="true" />}
      {children}
    </span>
  )
}

Badge.displayName = 'Badge'
