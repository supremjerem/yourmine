import type { ToastType } from '../types'

interface ToastProps {
  message: string
  type?: ToastType
}

function Toast({ message, type = 'info' }: ToastProps) {
  return (
    <div
      className={`toast toast-${type}`}
      role="alert"
      aria-live="polite"
    >
      {message}
    </div>
  )
}

export default Toast
