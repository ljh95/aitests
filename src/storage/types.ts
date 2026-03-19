import type { Note } from '@/types/note'

export interface StorageBackend {
  readonly type: 'localStorage' | 'filesystem'

  // Core CRUD
  loadAllNotes(): Promise<Note[]>
  saveNote(note: Note): Promise<void>
  deleteNote(id: string): Promise<void>

  // Folder operations
  listFolders(): Promise<string[]>
  createFolder(path: string): Promise<void>
  deleteFolder(path: string): Promise<void>

  // Storage info
  getStorageInfo(): Promise<{ used: number; limit: number; location: string }>

  // Lifecycle
  initialize(): Promise<void>
  dispose(): void
}
