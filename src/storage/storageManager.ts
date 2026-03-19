import { Capacitor } from '@capacitor/core'
import type { StorageBackend } from './types'
import { LocalStorageBackend } from './localStorageBackend'
import { FileSystemBackend } from './fileSystemBackend'
import { CapacitorFsBackend } from './capacitorFsBackend'
import { loadDirectoryHandle, clearDirectoryHandle } from './handleStore'

const STORAGE_MODE_KEY = 'kab_storage_mode'
const isNative = Capacitor.isNativePlatform()

export type StorageMode = 'localStorage' | 'filesystem'

class StorageManager {
  private backend: StorageBackend | null = null
  private fsBackend: FileSystemBackend | null = null
  private capFsBackend: CapacitorFsBackend | null = null

  /** Check if File System Access API is available (Chrome/Edge web) */
  isFileSystemSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window
  }

  /** Check if Capacitor native filesystem is available (Android/iOS) */
  isNativeFileSystemSupported(): boolean {
    return isNative
  }

  /** Check if any vault mode is available */
  isVaultSupported(): boolean {
    return this.isFileSystemSupported() || this.isNativeFileSystemSupported()
  }

  /** Get the persisted storage mode preference */
  getStorageMode(): StorageMode {
    try {
      if (isNative) {
        // On native, check localStorage directly (Preferences is async)
        const mode = localStorage.getItem(STORAGE_MODE_KEY)
        if (mode === 'filesystem') return 'filesystem'
      } else {
        const mode = localStorage.getItem(STORAGE_MODE_KEY)
        if (mode === 'filesystem' && this.isFileSystemSupported()) return 'filesystem'
      }
    } catch {
      // Ignore
    }
    return 'localStorage'
  }

  /** Set the storage mode preference */
  setStorageMode(mode: StorageMode): void {
    localStorage.setItem(STORAGE_MODE_KEY, mode)
  }

  /** Get the current backend, initializing if needed */
  async getBackend(): Promise<StorageBackend> {
    if (this.backend) return this.backend

    const mode = this.getStorageMode()
    if (mode === 'filesystem') {
      // Native platform: use Capacitor Filesystem
      if (isNative) {
        try {
          const cap = new CapacitorFsBackend()
          await cap.initialize()
          this.capFsBackend = cap
          this.backend = cap
          return this.backend
        } catch {
          this.setStorageMode('localStorage')
        }
      } else {
        // Web: use File System Access API
        try {
          const handle = await loadDirectoryHandle()
          if (handle) {
            const permission = await handle.requestPermission({ mode: 'readwrite' })
            if (permission === 'granted') {
              const fs = new FileSystemBackend()
              fs.setRootHandle(handle)
              await fs.initialize(handle)
              this.fsBackend = fs
              this.backend = fs
              return this.backend
            }
          }
        } catch {
          // Fall back to localStorage
        }
        this.setStorageMode('localStorage')
      }
    }

    const ls = new LocalStorageBackend()
    await ls.initialize()
    this.backend = ls
    return this.backend
  }

  /** Switch to filesystem backend */
  async switchToFilesystem(): Promise<StorageBackend> {
    if (isNative) {
      const cap = new CapacitorFsBackend()
      await cap.initialize()
      this.capFsBackend = cap
      this.backend = cap
      this.setStorageMode('filesystem')
      return this.backend
    }

    const fs = new FileSystemBackend()
    await fs.initialize() // This triggers showDirectoryPicker
    this.fsBackend = fs
    this.backend = fs
    this.setStorageMode('filesystem')
    return this.backend
  }

  /** Switch back to localStorage backend */
  async switchToLocalStorage(): Promise<StorageBackend> {
    if (this.fsBackend) {
      this.fsBackend.dispose()
      this.fsBackend = null
    }
    if (this.capFsBackend) {
      this.capFsBackend.dispose()
      this.capFsBackend = null
    }
    await clearDirectoryHandle()
    this.setStorageMode('localStorage')

    const ls = new LocalStorageBackend()
    await ls.initialize()
    this.backend = ls
    return this.backend
  }

  /** Migrate notes from current backend to a new backend */
  async migrateNotes(from: StorageBackend, to: StorageBackend): Promise<number> {
    const notes = await from.loadAllNotes()
    let count = 0
    for (const note of notes) {
      await to.saveNote(note)
      count++
    }
    return count
  }

  /** Get the filesystem backend instance (for polling, etc.) */
  getFileSystemBackend(): FileSystemBackend | null {
    return this.fsBackend
  }

  /** Get the Capacitor filesystem backend instance */
  getCapacitorFsBackend(): CapacitorFsBackend | null {
    return this.capFsBackend
  }

  /** Get any active vault backend (web or native) */
  getVaultBackend(): FileSystemBackend | CapacitorFsBackend | null {
    return this.fsBackend || this.capFsBackend
  }

  /** Reset manager state (for testing or disconnection) */
  reset(): void {
    if (this.fsBackend) {
      this.fsBackend.dispose()
      this.fsBackend = null
    }
    if (this.capFsBackend) {
      this.capFsBackend.dispose()
      this.capFsBackend = null
    }
    this.backend = null
  }
}

export const storageManager = new StorageManager()
