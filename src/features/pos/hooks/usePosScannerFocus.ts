import { useEffect, type RefObject } from 'react'

/**
 * Ensures USB barcode scanner input retains autofocus without stealing focus
 * from active user interactions (modals, search boxes, text inputs).
 * Conforms to RF-01.4.
 */
export function usePosScannerFocus(
  barcodeInputRef: RefObject<HTMLInputElement | null>,
  isModalOpen: boolean
): void {
  useEffect(() => {
    if (isModalOpen) return

    // Initial autofocus on mount
    barcodeInputRef.current?.focus()

    const handleClick = (e: MouseEvent) => {
      if (isModalOpen) return

      const target = e.target as HTMLElement | null
      if (!target) return

      // Do not steal focus if the user clicked an interactive control or dialog
      const isInteractive = Boolean(
        target.closest('input, textarea, select, button, a, [role="dialog"], [role="button"]')
      )

      if (!isInteractive) {
        barcodeInputRef.current?.focus()
      }
    }

    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [barcodeInputRef, isModalOpen])
}
