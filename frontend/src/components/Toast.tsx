import styles from './Toast.module.css'
import type { ToastType } from '../types'

interface ToastProps {
  readonly message: string
  readonly type?: ToastType
}

function Toast({ message, type = 'info' }: ToastProps) {
  return (
    <div
      className={styles.toast}
      data-type={type}
      data-testid={`toast-${type}`}
      role="alert"
      aria-live="polite"
    >
      {message}
    </div>
  )
}

export default Toast
