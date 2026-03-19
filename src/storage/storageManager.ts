import type { StorageBackend } from './types'
import { LocalStorageBackend } from './localStorageBackend'
import { FileSystemBackend } from './fileSystemBackend'
import { loadDirectoryHandle, clearDirectoryHandle } from './handleStore'

const STORAGE_MODE_KEY = 'kab_storage_mode'

export type StorageMode = 'localStorage' | 'filesystem'

class StorageManager {
  private backend: StorageBackend | null = null
  private fsBackend: FileSystemBackend | null = null

  /** Check if File System Access API is available */
  isFileSystemSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window
  }

  /** Get the persisted storage mode preference */
  getStorageMode(): StorageMode {
    try {
      const mode = localStorage.getItem(STORAGE_MODE_KEY)
      if (mode === 'filesystem' && this.isFileSystemSupported()) return 'filesystem'
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
      try {
        const handle = await loadDirectoryHandle()
        if (handle) {
          // Verify we still have permission
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
      // If filesystem failed, revert to localStorage
      this.setStorageMode('localStorage')
    }

    const ls = new LocalStorageBackend()
    await ls.initialize()
    this.backend = ls
    return this.backend
  }

  /** Switch to filesystem backend with a new directory picker */
  async switchToFilesystem(): Promise<StorageBackend> {
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

  /** Reset manager state (for testing or disconnection) */
  reset(): void {
    if (this.fsBackend) {
      this.fsBackend.dispose()
      this.fsBackend = null
    }
    this.backend = null
  }
}

export const storageManager = new StorageManager()
