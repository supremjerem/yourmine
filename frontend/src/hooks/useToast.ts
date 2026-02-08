import { useState, useCallback } from 'react'
import type { Toast, ToastType } from '../types'

export function useToast(duration = 3000) {
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), duration)
  }, [duration])

  return { toast, showToast }
}

export default useToast
