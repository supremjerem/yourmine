import { Component } from 'react'
import styles from './ErrorBoundary.module.css'
import type { ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  handleReload = () => {
    // A full reload rather than clearing the flag: whatever state produced the
    // crash is still in memory, so retrying in place tends to fail again.
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className={styles.boundary} role="alert">
        <h1 className={styles.heading}>Yourmine stopped</h1>
        <p className={styles.body}>
          Something went wrong and the page could not carry on. Reloading usually clears
          it.
        </p>

        {this.state.error?.message && (
          <details className={styles.details}>
            <summary className={styles.summary}>Technical detail</summary>
            <pre className={styles.trace}>{this.state.error.message}</pre>
          </details>
        )}

        <button className={styles.action} onClick={this.handleReload} type="button">
          Reload
        </button>
      </div>
    )
  }
}

export default ErrorBoundary
