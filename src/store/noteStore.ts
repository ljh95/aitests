import { create } from 'zustand'
import type { Note, Category } from '@/types/note'
import { loadNotes, saveNotes } from '@/storage/localStorage'
import { seedNotes } from '@/constants/seedNotes'

interface NoteState {
  notes: Note[]
  activeNoteId: string | null
  searchQuery: string
  categoryFilter: Category | null

  createNote: (category?: Category) => string
  updateNote: (id: string, partial: Partial<Note>) => void
  deleteNote: (id: string) => void
  setActiveNote: (id: string | null) => void
  setSearch: (query: string) => void
  setCategoryFilter: (category: Category | null) => void
  togglePin: (id: string) => void
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null

function debouncedSave(notes: Note[]) {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => saveNotes(notes), 500)
}

// Flush pending saves immediately (called on beforeunload)
function flushSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
    saveNotes(useNoteStore.getState().notes)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushSave)
}

export const useNoteStore = create<NoteState>((set, get) => {
  let initial = loadNotes()
  if (initial.length === 0) {
    initial = seedNotes()
    saveNotes(initial)
  }

  return {
    notes: initial,
    activeNoteId: initial[0]?.id ?? null,
    searchQuery: '',
    categoryFilter: null,

    createNote: (category: Category = 'study') => {
      const now = new Date().toISOString()
      const note: Note = {
        id: crypto.randomUUID(),
        title: '',
        content: '',
        category,
        tags: [],
        createdAt: now,
        updatedAt: now,
        isPinned: false,
      }
      const notes = [note, ...get().notes]
      set({ notes, activeNoteId: note.id })
      debouncedSave(notes)
      return note.id
    },

    updateNote: (id, partial) => {
      const notes = get().notes.map((n) =>
        n.id === id ? { ...n, ...partial, updatedAt: new Date().toISOString() } : n,
      )
      set({ notes })
      debouncedSave(notes)
    },

    deleteNote: (id) => {
      const { notes, activeNoteId } = get()
      const filtered = notes.filter((n) => n.id !== id)
      const newActive = activeNoteId === id
        ? filtered[0]?.id ?? null
        : activeNoteId
      set({ notes: filtered, activeNoteId: newActive })
      debouncedSave(filtered)
    },

    setActiveNote: (id) => set({ activeNoteId: id }),
    setSearch: (query) => set({ searchQuery: query }),
    setCategoryFilter: (category) => set({ categoryFilter: category }),

    togglePin: (id) => {
      const notes = get().notes.map((n) =>
        n.id === id ? { ...n, isPinned: !n.isPinned } : n,
      )
      set({ notes })
      debouncedSave(notes)
    },
  }
})
