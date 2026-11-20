import React from 'react'
import { getCardClasses, type CardPadding } from './variants'

export interface CardProps extends React.ComponentPropsWithRef<'div'> {
  padding?: CardPadding
  children: React.ReactNode
}

/**
 * Standard container surface adhering to Material Design 3 tokens.
 */
export const Card: React.FC<CardProps> = ({
  padding = 'md',
  className,
  children,
  ...props
}) => {
  return (
    <div className={getCardClasses({ padding, className })} {...props}>
      {children}
    </div>
  )
}

Card.displayName = 'Card'
