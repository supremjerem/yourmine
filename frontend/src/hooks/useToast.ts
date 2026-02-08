import { useState, useCallback, useRef } from 'react'
import type { Toast, ToastType } from '../types'

export function useToast(duration = 3000) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    setToast({ message, type })
    timerRef.current = setTimeout(() => setToast(null), duration)
  }, [duration])

  return { toast, showToast }
}

export default useToast
