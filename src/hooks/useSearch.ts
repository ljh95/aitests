import { useMemo, useEffect, useRef } from 'react'
import { useNoteStore } from '@/store/noteStore'
import { buildIndex, searchNotes } from '@/lib/search'
import type { Note, Category } from '@/types/note'

export function useFilteredNotes(): Note[] {
  const notes = useNoteStore((s) => s.notes)
  const searchQuery = useNoteStore((s) => s.searchQuery)
  const categoryFilter = useNoteStore((s) => s.categoryFilter)
  const prevNotesRef = useRef(notes)

  useEffect(() => {
    if (prevNotesRef.current !== notes) {
      buildIndex(notes)
      prevNotesRef.current = notes
    }
  }, [notes])

  return useMemo(() => {
    let result = searchQuery ? searchNotes(searchQuery, notes) : notes

    if (categoryFilter) {
      result = result.filter((n) => n.category === categoryFilter)
    }

    return result.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }, [notes, searchQuery, categoryFilter])
}

export function useCategoryCount(): Record<Category | 'all', number> {
  const notes = useNoteStore((s) => s.notes)
  return useMemo(() => {
    const counts: Record<string, number> = { all: notes.length }
    for (const note of notes) {
      counts[note.category] = (counts[note.category] ?? 0) + 1
    }
    return counts as Record<Category | 'all', number>
  }, [notes])
}
