import React, { useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends React.ComponentPropsWithRef<'select'> {
  label?: string
  error?: string
  helperText?: string
  options?: SelectOption[]
  containerClassName?: string
  children?: React.ReactNode
}

/**
 * Standard Select primitive adhering to Material Design 3 tokens.
 * Uses useId() as fallback for accessible label and aria attribute linking.
 * Supports React 19 transparent ref passing via React.ComponentPropsWithRef.
 */
export const Select: React.FC<SelectProps> = ({
  id,
  label,
  error,
  helperText,
  options,
  children,
  className,
  containerClassName,
  disabled,
  ...props
}) => {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const errorId = error ? `${selectId}-error` : undefined
  const helperId = helperText ? `${selectId}-helper` : undefined
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', containerClassName)}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-on-surface select-none"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        <select
          id={selectId}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            'w-full h-10 pl-3 pr-10 bg-surface text-on-surface font-medium rounded-lg border text-sm transition-all',
            'appearance-none focus:outline-none focus:ring-2 focus:ring-offset-1 cursor-pointer',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-container-high',
            error
              ? 'border-error focus:border-error focus:ring-error/30'
              : 'border-slate-300 focus:border-primary focus:ring-primary/30',
            className
          )}
          {...props}
        >
          {options
            ? options.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDown
          className="absolute right-3 w-4 h-4 text-outline pointer-events-none shrink-0"
          aria-hidden="true"
        />
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

Select.displayName = 'Select'
