import { describe, it, expect } from 'vitest'
import {
  getButtonClasses,
  getBadgeClasses,
  getBadgeDotClasses,
  getAlertClasses,
  getCardClasses,
  buttonVariantMap,
  buttonSizeMap,
  badgeVariantMap,
  badgeSizeMap,
  badgeDotColorMap,
  alertVariantMap,
  alertIconColorMap,
  cardPaddingMap,
  type ButtonVariant,
  type ButtonSize,
  type BadgeVariant,
  type BadgeSize,
  type AlertVariant,
  type CardPadding,
} from './variants'

describe('Design System UI Variants (Pure Resolvers)', () => {
  describe('getButtonClasses', () => {
    it('applies default classes (primary variant and md size)', () => {
      const classes = getButtonClasses()
      expect(classes).toContain('bg-primary')
      expect(classes).toContain('text-on-primary')
      expect(classes).toContain('h-10')
      expect(classes).toContain('px-4')
      expect(classes).toContain('inline-flex')
    })

    it('resolves all button variants correctly', () => {
      const variants: ButtonVariant[] = ['primary', 'secondary', 'outline', 'ghost', 'danger']
      variants.forEach((variant) => {
        const classes = getButtonClasses({ variant })
        expect(classes).toContain(buttonVariantMap[variant])
      })
    })

    it('resolves all button sizes correctly', () => {
      const sizes: ButtonSize[] = ['sm', 'md', 'lg']
      sizes.forEach((size) => {
        const classes = getButtonClasses({ size })
        expect(classes).toContain(buttonSizeMap[size])
      })
    })

    it('handles isLoading state without losing base styles', () => {
      const classes = getButtonClasses({ isLoading: true })
      expect(classes).toContain('cursor-wait')
      expect(classes).toContain('opacity-80')
    })

    it('merges custom className cleanly', () => {
      const classes = getButtonClasses({ className: 'custom-class' })
      expect(classes).toContain('custom-class')
    })
  })

  describe('getBadgeClasses and getBadgeDotClasses', () => {
    it('applies default badge classes (neutral variant and md size)', () => {
      const classes = getBadgeClasses()
      expect(classes).toContain('bg-surface-container-high')
      expect(classes).toContain('text-xs')
      expect(classes).toContain('rounded-full')
    })

    it('resolves all badge variants correctly', () => {
      const variants: BadgeVariant[] = ['success', 'warning', 'danger', 'info', 'neutral']
      variants.forEach((variant) => {
        const classes = getBadgeClasses({ variant })
        expect(classes).toContain(badgeVariantMap[variant])
      })
    })

    it('resolves all badge sizes correctly', () => {
      const sizes: BadgeSize[] = ['sm', 'md']
      sizes.forEach((size) => {
        const classes = getBadgeClasses({ size })
        expect(classes).toContain(badgeSizeMap[size])
      })
    })

    it('resolves dot indicator colors for all variants', () => {
      const variants: BadgeVariant[] = ['success', 'warning', 'danger', 'info', 'neutral']
      variants.forEach((variant) => {
        const dotClasses = getBadgeDotClasses(variant)
        expect(dotClasses).toContain(badgeDotColorMap[variant])
        expect(dotClasses).toContain('rounded-full')
      })
    })

    it('appends custom className to badge', () => {
      const classes = getBadgeClasses({ className: 'ml-2' })
      expect(classes).toContain('ml-2')
    })
  })

  describe('getAlertClasses', () => {
    it('applies default alert classes (info variant)', () => {
      const classes = getAlertClasses()
      expect(classes).toContain('border-tertiary-container/50')
      expect(classes).toContain('rounded-lg')
    })

    it('resolves all alert variants and icon colors correctly', () => {
      const variants: AlertVariant[] = ['info', 'success', 'warning', 'error']
      variants.forEach((variant) => {
        const classes = getAlertClasses({ variant })
        expect(classes).toContain(alertVariantMap[variant])
        expect(alertIconColorMap[variant]).toBeDefined()
      })
    })

    it('appends custom className to alert banner', () => {
      const classes = getAlertClasses({ className: 'shadow-md' })
      expect(classes).toContain('shadow-md')
    })
  })

  describe('getCardClasses', () => {
    it('applies default card classes (md padding)', () => {
      const classes = getCardClasses()
      expect(classes).toContain('bg-surface-container-lowest')
      expect(classes).toContain('rounded-xl')
      expect(classes).toContain('p-5')
    })

    it('resolves all card paddings correctly', () => {
      const paddings: CardPadding[] = ['none', 'sm', 'md', 'lg']
      paddings.forEach((padding) => {
        const classes = getCardClasses({ padding })
        expect(classes).toContain(cardPaddingMap[padding])
      })
    })

    it('appends custom className to card', () => {
      const classes = getCardClasses({ className: 'hover:shadow-lg' })
      expect(classes).toContain('hover:shadow-lg')
    })
  })
})
