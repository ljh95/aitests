import Fuse, { type IFuseOptions } from 'fuse.js'
import type { Note } from '@/types/note'

const fuseOptions: IFuseOptions<Note> = {
  keys: [
    { name: 'title', weight: 2 },
    { name: 'content', weight: 1 },
    { name: 'tags', weight: 1.5 },
    { name: 'category', weight: 0.5 },
  ],
  threshold: 0.3,
  ignoreLocation: true,
  minMatchCharLength: 2,
}

let fuse: Fuse<Note> | null = null

export function buildIndex(notes: Note[]): void {
  fuse = new Fuse(notes, fuseOptions)
}

export function searchNotes(query: string, notes: Note[]): Note[] {
  if (!query.trim()) return notes
  if (!fuse) buildIndex(notes)
  return fuse!.search(query).map((r) => r.item)
}
