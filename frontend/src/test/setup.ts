import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

/**
 * Minimal in-memory Storage implementation.
 *
 * Neither jsdom nor Node 26 provides a usable `localStorage` here: Node's own
 * implementation is gated behind `--localstorage-file`. Supplying our own keeps
 * the tests deterministic and independent of that.
 */
function createStorage(): Storage {
  let entries = new Map<string, string>()

  return {
    get length() {
      return entries.size
    },
    key: (index) => [...entries.keys()][index] ?? null,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, String(value))
    },
    removeItem: (key) => {
      entries.delete(key)
    },
    clear: () => {
      entries = new Map()
    }
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: createStorage(),
  configurable: true,
  writable: true
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})
