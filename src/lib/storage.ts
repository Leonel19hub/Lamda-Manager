/**
 * Safe and resilient LocalStorage adapter
 * Implements SPEC-001 [RF-03]: Versioning, fallback defaults, and automated corruption backups.
 */

export interface VersionedStoragePayload<T> {
  version: number;
  data: T;
  timestamp: string;
}

export interface StorageOptions<T> {
  version?: number;
  fallback: T;
  storage?: Storage;
}

export class SafeStorage {
  private storage: Storage | null;

  constructor(customStorage?: Storage) {
    if (customStorage) {
      this.storage = customStorage;
    } else {
      try {
        this.storage = typeof window !== 'undefined' ? window.localStorage : null;
      } catch {
        this.storage = null;
      }
    }
  }

  /**
   * Reads and parses a versioned value from storage safely.
   * If parsing fails or data is corrupted, saves a backup under `backup_corrupt_<key>_<timestamp>`
   * and returns the fallback value without throwing.
   */
  getItem<T>(key: string, options: StorageOptions<T>): T {
    if (!this.storage) {
      return options.fallback;
    }

    let rawValue: string | null = null;
    try {
      rawValue = this.storage.getItem(key);
    } catch {
      return options.fallback;
    }

    if (rawValue === null) {
      return options.fallback;
    }

    try {
      const parsed: unknown = JSON.parse(rawValue);

      // Check if it's a versioned object
      if (
        parsed &&
        typeof parsed === 'object' &&
        'data' in parsed &&
        'version' in parsed
      ) {
        const payload = parsed as VersionedStoragePayload<T>;
        const currentVersion = options.version ?? 1;

        if (payload.version !== currentVersion) {
          // Version mismatch: backup and return fallback
          this.backupCorruptedData(key, rawValue, 'VERSION_MISMATCH');
          return options.fallback;
        }

        return payload.data;
      }

      // Legacy or unversioned payload: return parsed data directly
      return parsed as T;
    } catch {
      // JSON syntax error or corrupt payload
      this.backupCorruptedData(key, rawValue, 'JSON_SYNTAX_ERROR');
      return options.fallback;
    }
  }

  /**
   * Safely serializes and saves a versioned value into storage.
   */
  setItem<T>(key: string, data: T, version: number = 1): boolean {
    if (!this.storage) {
      return false;
    }

    const payload: VersionedStoragePayload<T> = {
      version,
      data,
      timestamp: new Date().toISOString(),
    };

    try {
      this.storage.setItem(key, JSON.stringify(payload));
      return true;
    } catch (error) {
      console.warn(`[SafeStorage] Failed to save key "${key}":`, error);
      return false;
    }
  }

  /**
   * Removes an item safely.
   */
  removeItem(key: string): boolean {
    if (!this.storage) {
      return false;
    }
    try {
      this.storage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Creates a backup of corrupted data for audit/recovery.
   */
  private backupCorruptedData(key: string, rawData: string, reason: string): void {
    const backupKey = `backup_corrupt_${key}_${Date.now()}`;
    try {
      this.storage?.setItem(
        backupKey,
        JSON.stringify({
          originalKey: key,
          corruptedData: rawData,
          reason,
          timestamp: new Date().toISOString(),
        })
      );
      console.warn(
        `[SafeStorage] Corrupted data for key "${key}" backed up to "${backupKey}" (Reason: ${reason})`
      );
    } catch {
      // Ignore backup write failures (e.g. storage full)
    }
  }
}

export const safeStorage = new SafeStorage();
