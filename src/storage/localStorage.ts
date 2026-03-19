import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import type { Note } from '@/types/note'

const NOTES_KEY = 'kab-notes'
const VERSION_KEY = 'kab-version'
const CURRENT_VERSION = 1

const isNative = Capacitor.isNativePlatform()

// --- Sync API (used by Zustand store init) ---

export function loadNotes(): Note[] {
  if (isNative) return [] // Native loads async, handled by loadNotesAsync
  try {
    const raw = localStorage.getItem(NOTES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as Note[]
  } catch {
    return []
  }
}

export function saveNotes(notes: Note[]): void {
  if (isNative) {
    saveNotesAsync(notes)
    return
  }
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
    localStorage.setItem(VERSION_KEY, String(CURRENT_VERSION))
  } catch (e) {
    console.error('Failed to save notes:', e)
  }
}

// --- Async API (for Capacitor Preferences) ---

export async function loadNotesAsync(): Promise<Note[]> {
  if (!isNative) return loadNotes()
  try {
    const { value } = await Preferences.get({ key: NOTES_KEY })
    if (!value) return []
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed as Note[]
  } catch {
    return []
  }
}

async function saveNotesAsync(notes: Note[]): Promise<void> {
  try {
    await Preferences.set({ key: NOTES_KEY, value: JSON.stringify(notes) })
    await Preferences.set({ key: VERSION_KEY, value: String(CURRENT_VERSION) })
  } catch (e) {
    console.error('Failed to save notes (native):', e)
  }
}

export function getStorageUsage(): { used: number; limit: number } {
  if (isNative) return { used: 0, limit: 10 * 1024 * 1024 }
  let used = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      used += localStorage.getItem(key)?.length ?? 0
    }
  }
  return { used: used * 2, limit: 5 * 1024 * 1024 }
}
