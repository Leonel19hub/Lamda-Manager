import { useState, useRef, useCallback, useEffect } from 'react'

export interface TimedNoticeReturn {
  notice: string | null
  show: (message: string, durationMs?: number) => void
  clear: () => void
}

/**
 * Manages timed ephemeral notices with automatic cleanup on unmount or override.
 * Conforms to RF-05.6.
 */
export function useTimedNotice(defaultDuration = 2000): TimedNoticeReturn {
  const [notice, setNotice] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setNotice(null)
  }, [])

  const show = useCallback(
    (message: string, durationMs = defaultDuration) => {
      clear()
      setNotice(message)
      timerRef.current = setTimeout(() => {
        setNotice(null)
        timerRef.current = null
      }, durationMs)
    },
    [defaultDuration, clear]
  )

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return { notice, show, clear }
}
