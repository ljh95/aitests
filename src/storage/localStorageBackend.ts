import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import type { Note } from '@/types/note'
import type { StorageBackend } from './types'

const NOTES_KEY = 'kab-notes'
const VERSION_KEY = 'kab-version'
const CURRENT_VERSION = 1
const isNative = Capacitor.isNativePlatform()

export class LocalStorageBackend implements StorageBackend {
  readonly type = 'localStorage' as const
  private notes: Note[] = []

  async initialize(): Promise<void> {
    this.notes = await this.loadFromStorage()
  }

  async loadAllNotes(): Promise<Note[]> {
    this.notes = await this.loadFromStorage()
    return this.notes
  }

  async saveNote(note: Note): Promise<void> {
    const idx = this.notes.findIndex((n) => n.id === note.id)
    if (idx >= 0) {
      this.notes[idx] = note
    } else {
      this.notes.unshift(note)
    }
    await this.saveToStorage(this.notes)
  }

  async deleteNote(id: string): Promise<void> {
    this.notes = this.notes.filter((n) => n.id !== id)
    await this.saveToStorage(this.notes)
  }

  async listFolders(): Promise<string[]> {
    return []
  }

  async createFolder(): Promise<void> {
    // No-op for localStorage
  }

  async deleteFolder(): Promise<void> {
    // No-op for localStorage
  }

  async getStorageInfo(): Promise<{ used: number; limit: number; location: string }> {
    if (isNative) {
      return { used: 0, limit: 10 * 1024 * 1024, location: 'Device Storage' }
    }
    let used = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) used += localStorage.getItem(key)?.length ?? 0
    }
    return { used: used * 2, limit: 5 * 1024 * 1024, location: 'Browser localStorage' }
  }

  dispose(): void {
    // Nothing to clean up
  }

  // --- Private ---

  private async loadFromStorage(): Promise<Note[]> {
    try {
      if (isNative) {
        const { value } = await Preferences.get({ key: NOTES_KEY })
        if (!value) return []
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
      }
      const raw = localStorage.getItem(NOTES_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  private async saveToStorage(notes: Note[]): Promise<void> {
    try {
      const json = JSON.stringify(notes)
      if (isNative) {
        await Preferences.set({ key: NOTES_KEY, value: json })
        await Preferences.set({ key: VERSION_KEY, value: String(CURRENT_VERSION) })
      } else {
        localStorage.setItem(NOTES_KEY, json)
        localStorage.setItem(VERSION_KEY, String(CURRENT_VERSION))
      }
    } catch (e) {
      console.error('Failed to save notes:', e)
    }
  }
}
