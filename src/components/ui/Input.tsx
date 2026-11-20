import React, { useId } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.ComponentPropsWithRef<'input'> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightElement?: React.ReactNode
  containerClassName?: string
}

/**
 * Standard Input primitive adhering to Material Design 3 tokens.
 * Uses useId() as fallback for accessible label and aria attribute linking.
 * Supports React 19 transparent ref passing via React.ComponentPropsWithRef.
 */
export const Input: React.FC<InputProps> = ({
  id,
  label,
  error,
  helperText,
  leftIcon,
  rightElement,
  className,
  containerClassName,
  disabled,
  ...props
}) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = error ? `${inputId}-error` : undefined
  const helperId = helperText ? `${inputId}-helper` : undefined
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-on-surface select-none"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-outline shrink-0">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            'w-full h-10 px-3 bg-surface text-on-surface font-medium rounded-lg border text-sm transition-all',
            'placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-offset-1',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-container-high',
            error
              ? 'border-error focus:border-error focus:ring-error/30'
              : 'border-slate-300 focus:border-primary focus:ring-primary/30',
            Boolean(leftIcon) && 'pl-10',
            Boolean(rightElement) && 'pr-10',
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 flex items-center shrink-0">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-error font-medium">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={helperId} className="text-xs text-outline font-normal">
          {helperText}
        </p>
      )}
    </div>
  )
}

Input.displayName = 'Input'
