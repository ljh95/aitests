import { create } from 'zustand'
import type { Note, Category } from '@/types/note'
import { storageManager } from '@/storage/storageManager'
import type { StorageBackend } from '@/storage/types'
import { seedNotes } from '@/constants/seedNotes'

interface NoteState {
  notes: Note[]
  activeNoteId: string | null
  searchQuery: string
  categoryFilter: Category | null
  currentFolder: string
  storageReady: boolean
  storageMode: 'localStorage' | 'filesystem'
  folders: string[]

  hydrate: () => Promise<void>
  createNote: (category?: Category) => string
  updateNote: (id: string, partial: Partial<Note>) => void
  deleteNote: (id: string) => void
  setActiveNote: (id: string | null) => void
  setSearch: (query: string) => void
  setCategoryFilter: (category: Category | null) => void
  togglePin: (id: string) => void
  setCurrentFolder: (folder: string) => void
  refreshFolders: () => Promise<void>
  switchToFilesystem: () => Promise<void>
  switchToLocalStorage: () => Promise<void>
  migrateToFilesystem: () => Promise<number>
}

let backend: StorageBackend | null = null
let saveTimeout: ReturnType<typeof setTimeout> | null = null

function debouncedSaveNote(note: Note) {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(async () => {
    if (backend) await backend.saveNote(note)
  }, 500)
}

function flushSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
    const state = useNoteStore.getState()
    const activeNote = state.notes.find((n) => n.id === state.activeNoteId)
    if (activeNote && backend) {
      backend.saveNote(activeNote)
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushSave)
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  activeNoteId: null,
  searchQuery: '',
  categoryFilter: null,
  currentFolder: '',
  storageReady: false,
  storageMode: storageManager.getStorageMode(),
  folders: [],

  hydrate: async () => {
    backend = await storageManager.getBackend()

    let notes: Note[]
    let folders: string[]
    try {
      notes = await backend.loadAllNotes()
      folders = await backend.listFolders()
    } catch (e) {
      // Filesystem backend failed (e.g. directory no longer exists) — fall back to localStorage
      console.warn('Storage backend failed, falling back to localStorage:', e)
      backend = await storageManager.switchToLocalStorage()
      notes = await backend.loadAllNotes()
      folders = await backend.listFolders()
    }

    if (notes.length === 0 && backend.type === 'localStorage') {
      const seeds = seedNotes()
      for (const note of seeds) {
        await backend.saveNote(note)
      }
      notes = seeds
    }

    // Start polling if filesystem (web or native)
    const vaultBackend = storageManager.getVaultBackend()
    if (vaultBackend && 'startPolling' in vaultBackend) {
      vaultBackend.startPolling((updatedNotes) => {
        set({ notes: updatedNotes })
      })
    }

    set({
      notes,
      activeNoteId: notes[0]?.id ?? null,
      storageReady: true,
      storageMode: backend.type,
      folders,
    })
  },

  createNote: (category: Category = 'study') => {
    const now = new Date().toISOString()
    const { currentFolder } = get()
    const note: Note = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      category,
      tags: [],
      createdAt: now,
      updatedAt: now,
      isPinned: false,
      folderPath: currentFolder || undefined,
    }
    const notes = [note, ...get().notes]
    set({ notes, activeNoteId: note.id })
    debouncedSaveNote(note)
    return note.id
  },

  updateNote: (id, partial) => {
    const notes = get().notes.map((n) =>
      n.id === id ? { ...n, ...partial, updatedAt: new Date().toISOString() } : n,
    )
    set({ notes })
    const updated = notes.find((n) => n.id === id)
    if (updated) debouncedSaveNote(updated)
  },

  deleteNote: (id) => {
    const { notes, activeNoteId } = get()
    const filtered = notes.filter((n) => n.id !== id)
    const newActive = activeNoteId === id ? filtered[0]?.id ?? null : activeNoteId
    set({ notes: filtered, activeNoteId: newActive })
    if (backend) backend.deleteNote(id)
  },

  setActiveNote: (id) => set({ activeNoteId: id }),
  setSearch: (query) => set({ searchQuery: query }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),

  togglePin: (id) => {
    const notes = get().notes.map((n) =>
      n.id === id ? { ...n, isPinned: !n.isPinned } : n,
    )
    set({ notes })
    const updated = notes.find((n) => n.id === id)
    if (updated) debouncedSaveNote(updated)
  },

  setCurrentFolder: (folder) => set({ currentFolder: folder }),

  refreshFolders: async () => {
    if (!backend) return
    const folders = await backend.listFolders()
    set({ folders })
  },

  switchToFilesystem: async () => {
    try {
      backend = await storageManager.switchToFilesystem()
      const notes = await backend.loadAllNotes()
      const folders = await backend.listFolders()

      const vaultBackend = storageManager.getVaultBackend()
      if (vaultBackend && 'startPolling' in vaultBackend) {
        vaultBackend.startPolling((updatedNotes) => {
          set({ notes: updatedNotes })
        })
      }

      set({
        notes,
        activeNoteId: notes[0]?.id ?? null,
        storageMode: 'filesystem',
        folders,
        currentFolder: '',
      })
    } catch (e) {
      console.error('Failed to switch to filesystem:', e)
      throw e
    }
  },

  switchToLocalStorage: async () => {
    backend = await storageManager.switchToLocalStorage()
    const notes = await backend.loadAllNotes()
    set({
      notes,
      activeNoteId: notes[0]?.id ?? null,
      storageMode: 'localStorage',
      folders: [],
      currentFolder: '',
    })
  },

  migrateToFilesystem: async () => {
    const currentNotes = get().notes
    const vaultBackend = storageManager.getVaultBackend()
    if (!vaultBackend) throw new Error('Filesystem backend not available')

    let count = 0
    for (const note of currentNotes) {
      await vaultBackend.saveNote(note)
      count++
    }
    return count
  },
}))
