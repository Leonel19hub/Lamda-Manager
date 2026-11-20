import { useEffect } from 'react'

export interface PosHotkeysProps {
  onCheckout: () => void
  onFocusSearch: () => void
  onTareScale: () => void
  onEscape: () => void
  isModalOpen: boolean
}

/**
 * Global keyboard shortcuts handler for POS operations:
 * - F12: Checkout (suspended while modal is open)
 * - F2: Fast focus on product search catalog (suspended while modal is open)
 * - F7: Scale tare (suspended while modal is open)
 * - Escape: Close active modal OR clear search & focus scanner
 *
 * Conforms to RF-05.1 to RF-05.5.
 */
export function usePosHotkeys({
  onCheckout,
  onFocusSearch,
  onTareScale,
  onEscape,
  isModalOpen,
}: PosHotkeysProps): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onEscape()
        return
      }

      // Suspend F-key shortcuts while any modal dialog is active (RF-05.4)
      if (isModalOpen) {
        return
      }

      if (e.key === 'F12') {
        e.preventDefault()
        onCheckout()
      } else if (e.key === 'F2') {
        e.preventDefault()
        onFocusSearch()
      } else if (e.key === 'F7') {
        e.preventDefault()
        onTareScale()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCheckout, onFocusSearch, onTareScale, onEscape, isModalOpen])
}
