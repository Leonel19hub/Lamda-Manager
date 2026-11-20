import React from 'react'
import { Loader2 } from 'lucide-react'
import {
  getButtonClasses,
  type ButtonVariant,
  type ButtonSize,
} from './variants'

export interface ButtonProps extends React.ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

/**
 * Standard Button primitive adhering to Material Design 3 tokens.
 * Supports React 19 native ref passing via React.ComponentPropsWithRef.
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}) => {
  const isButtonDisabled = Boolean(disabled || isLoading)

  return (
    <button
      type={type}
      disabled={isButtonDisabled}
      className={getButtonClasses({ variant, size, isLoading, className })}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0 flex items-center">{rightIcon}</span>}
        </>
      )}
    </button>
  )
}

Button.displayName = 'Button'
