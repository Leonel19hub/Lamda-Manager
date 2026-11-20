import { describe, it, expect, beforeEach } from 'vitest'
import { SafeStorage } from './storage'

class MockStorage implements Storage {
  private store: Record<string, string> = {}

  get length(): number {
    return Object.keys(this.store).length
  }

  clear(): void {
    this.store = {}
  }

  getAllKeys(): string[] {
    return Object.keys(this.store)
  }

  getItem(key: string): string | null {
    return this.store[key] ?? null
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null
  }

  removeItem(key: string): void {
    delete this.store[key]
  }

  setItem(key: string, value: string): void {
    this.store[key] = value
  }
}

describe('src/lib/storage (SafeStorage)', () => {
  let mockStorage: MockStorage
  let safeStorage: SafeStorage

  beforeEach(() => {
    mockStorage = new MockStorage()
    safeStorage = new SafeStorage(mockStorage)
  })

  it('saves and reads versioned data correctly', () => {
    const data = { cartCount: 5, total: 12500 }
    const success = safeStorage.setItem('pos_cart', data, 1)

    expect(success).toBe(true)

    const loaded = safeStorage.getItem('pos_cart', {
      version: 1,
      fallback: { cartCount: 0, total: 0 },
    })

    expect(loaded).toEqual(data)
  })

  it('returns fallback value if key does not exist', () => {
    const fallback = { items: [] }
    const loaded = safeStorage.getItem('non_existent', {
      version: 1,
      fallback,
    })

    expect(loaded).toEqual(fallback)
  })

  it('handles corrupted JSON syntax by backing it up and returning fallback', () => {
    // Inject corrupt raw data
    mockStorage.setItem('pos_ticket', '{"corrupted: json string...')

    const fallback = { ticketId: 'default' }
    const loaded = safeStorage.getItem('pos_ticket', {
      version: 1,
      fallback,
    })

    // Must return fallback without throwing
    expect(loaded).toEqual(fallback)

    // Must have created a backup key in storage
    const backupKeys = mockStorage.getAllKeys().filter((k) =>
      k.startsWith('backup_corrupt_pos_ticket_')
    )
    expect(backupKeys.length).toBe(1)

    const backupContent = JSON.parse(mockStorage.getItem(backupKeys[0])!)
    expect(backupContent.originalKey).toBe('pos_ticket')
    expect(backupContent.reason).toBe('JSON_SYNTAX_ERROR')
  })

  it('handles version mismatch by backing up and returning fallback', () => {
    // Save version 1
    safeStorage.setItem('settings', { theme: 'dark' }, 1)

    // Attempt to read as version 2
    const fallback = { theme: 'light' }
    const loaded = safeStorage.getItem('settings', {
      version: 2,
      fallback,
    })

    expect(loaded).toEqual(fallback)

    const backupKeys = mockStorage.getAllKeys().filter((k) =>
      k.startsWith('backup_corrupt_settings_')
    )
    expect(backupKeys.length).toBe(1)
  })

  it('removes item cleanly', () => {
    safeStorage.setItem('temp', 'value')
    expect(mockStorage.getItem('temp')).not.toBeNull()

    const removed = safeStorage.removeItem('temp')
    expect(removed).toBe(true)
    expect(mockStorage.getItem('temp')).toBeNull()
  })

  it('returns fallback gracefully if underlying storage is unavailable or throws', () => {
    const brokenStorage: Storage = {
      length: 0,
      clear: () => {},
      key: () => null,
      getItem: () => {
        throw new Error('Storage access denied')
      },
      setItem: () => {
        throw new Error('Quota exceeded')
      },
      removeItem: () => {
        throw new Error('Access denied')
      },
    }

    const brokenSafe = new SafeStorage(brokenStorage)
    const fallback = { id: 'fallback' }

    expect(brokenSafe.getItem('test', { fallback })).toEqual(fallback)
    expect(brokenSafe.setItem('test', { id: 1 })).toBe(false)
    expect(brokenSafe.removeItem('test')).toBe(false)
  })

  it('handles null storage gracefully', () => {
    const nullSafe = new SafeStorage(null as unknown as Storage)
    const fallback = { fallback: true }

    expect(nullSafe.getItem('key', { fallback })).toEqual(fallback)
    expect(nullSafe.setItem('key', 'data')).toBe(false)
    expect(nullSafe.removeItem('key')).toBe(false)
  })

  it('handles legacy unversioned payload correctly', () => {
    mockStorage.setItem('legacy_raw', JSON.stringify({ legacy: true }))
    const result = safeStorage.getItem('legacy_raw', { fallback: { legacy: false } })
    expect(result).toEqual({ legacy: true })
  })

  it('handles empty or whitespace raw storage values', () => {
    mockStorage.setItem('empty', '   ')
    const result = safeStorage.getItem('empty', { fallback: 'fb' })
    expect(result).toBe('fb')
  })

  it('creates instance safely with default constructor or when window throws', () => {
    const defaultInstance = new SafeStorage()
    expect(defaultInstance).toBeDefined()

    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
    try {
      Object.defineProperty(globalThis, 'window', {
        value: {
          get localStorage(): Storage {
            throw new Error('Access denied')
          },
        },
        configurable: true,
        writable: true,
      })
      const throwingSafe = new SafeStorage()
      expect(throwingSafe.getItem('key', { fallback: 'fb' })).toBe('fb')
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, 'window', descriptor)
      } else {
        delete (globalThis as Record<string, unknown>).window
      }
    }
  })

  it('defaults options.version to 1 when omitted', () => {
    safeStorage.setItem('key_default', { count: 5 })
    const result = safeStorage.getItem('key_default', { fallback: { count: 0 } })
    expect(result).toEqual({ count: 5 })
  })

  it('survives when backup creation fails due to storage failure', () => {
    mockStorage.setItem('corrupt', '{invalid_json')
    mockStorage.setItem = () => {
      throw new Error('Disk full')
    }
    const result = safeStorage.getItem('corrupt', { fallback: 'fallback_ok' })
    expect(result).toBe('fallback_ok')
  })
})
