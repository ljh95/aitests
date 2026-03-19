import type { Note } from '@/types/note'
import type { StorageBackend } from './types'
import { serializeNote, parseNoteFile, noteToFilename } from './frontmatter'
import { saveDirectoryHandle } from './handleStore'

/** Maps note ID → { handle, dirHandle, filename } for quick lookups */
interface FileEntry {
  dirHandle: FileSystemDirectoryHandle
  filename: string
  folderPath: string
}

export class FileSystemBackend implements StorageBackend {
  readonly type = 'filesystem' as const
  private rootHandle: FileSystemDirectoryHandle | null = null
  private fileMap = new Map<string, FileEntry>()
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private lastScanMap = new Map<string, number>() // filePath → lastModified timestamp

  async initialize(handle?: FileSystemDirectoryHandle | null): Promise<void> {
    if (handle) {
      this.rootHandle = handle
    }
    if (!this.rootHandle) {
      this.rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
    }
    await saveDirectoryHandle(this.rootHandle)
  }

  getRootHandle(): FileSystemDirectoryHandle | null {
    return this.rootHandle
  }

  setRootHandle(handle: FileSystemDirectoryHandle): void {
    this.rootHandle = handle
  }

  async loadAllNotes(): Promise<Note[]> {
    if (!this.rootHandle) return []
    this.fileMap.clear()
    this.lastScanMap.clear()
    const notes: Note[] = []
    await this.scanDirectory(this.rootHandle, '', notes)
    return notes
  }

  async saveNote(note: Note): Promise<void> {
    if (!this.rootHandle) return

    const existing = this.fileMap.get(note.id)
    const newFilename = noteToFilename(note)
    const folderPath = note.folderPath || ''

    // Get target directory handle
    const targetDir = folderPath
      ? await this.getOrCreateDir(this.rootHandle, folderPath)
      : this.rootHandle

    // If filename changed or folder changed, delete old file
    if (existing && (existing.filename !== newFilename || existing.folderPath !== folderPath)) {
      try {
        await existing.dirHandle.removeEntry(existing.filename)
      } catch {
        // Old file may already be gone
      }
    }

    // Write the new file
    const fileHandle = await targetDir.getFileHandle(newFilename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(serializeNote(note))
    await writable.close()

    // Update file map
    this.fileMap.set(note.id, { dirHandle: targetDir, filename: newFilename, folderPath })

    // Update scan map
    const fullPath = folderPath ? `${folderPath}/${newFilename}` : newFilename
    this.lastScanMap.set(fullPath, Date.now())
  }

  async deleteNote(id: string): Promise<void> {
    const entry = this.fileMap.get(id)
    if (!entry) return
    try {
      await entry.dirHandle.removeEntry(entry.filename)
    } catch {
      // File may already be deleted
    }
    this.fileMap.delete(id)
  }

  async listFolders(): Promise<string[]> {
    if (!this.rootHandle) return []
    const folders: string[] = []
    await this.collectFolders(this.rootHandle, '', folders)
    return folders.sort()
  }

  async createFolder(path: string): Promise<void> {
    if (!this.rootHandle) return
    await this.getOrCreateDir(this.rootHandle, path)
  }

  async deleteFolder(path: string): Promise<void> {
    if (!this.rootHandle) return
    const parts = path.split('/').filter(Boolean)
    if (parts.length === 0) return

    const folderName = parts.pop()!
    let parentDir = this.rootHandle
    for (const part of parts) {
      parentDir = await parentDir.getDirectoryHandle(part)
    }
    await parentDir.removeEntry(folderName, { recursive: true })
  }

  async getStorageInfo(): Promise<{ used: number; limit: number; location: string }> {
    const name = this.rootHandle?.name ?? 'Not connected'
    // File system has no practical limit
    let used = 0
    for (const [, entry] of this.fileMap) {
      try {
        const fileHandle = await entry.dirHandle.getFileHandle(entry.filename)
        const file = await fileHandle.getFile()
        used += file.size
      } catch {
        // Skip inaccessible files
      }
    }
    return { used, limit: Infinity, location: `Vault: ${name}` }
  }

  /** Start polling for external changes */
  startPolling(onChanges: (notes: Note[]) => void): void {
    this.stopPolling()
    this.pollTimer = setInterval(async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const changes = await this.detectChanges()
        if (changes) onChanges(changes)
      } catch {
        // Polling errors are non-fatal
      }
    }, 5000)
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  dispose(): void {
    this.stopPolling()
    this.fileMap.clear()
    this.lastScanMap.clear()
    this.rootHandle = null
  }

  // --- Private helpers ---

  private async scanDirectory(
    dirHandle: FileSystemDirectoryHandle,
    folderPath: string,
    notes: Note[],
  ): Promise<void> {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.md')) {
        try {
          const fileHandle = await dirHandle.getFileHandle(entry.name)
          const file = await fileHandle.getFile()
          const text = await file.text()
          const note = parseNoteFile(text)
          note.folderPath = folderPath

          notes.push(note)
          this.fileMap.set(note.id, { dirHandle, filename: entry.name, folderPath })

          const fullPath = folderPath ? `${folderPath}/${entry.name}` : entry.name
          this.lastScanMap.set(fullPath, file.lastModified)
        } catch {
          // Skip unreadable files
        }
      } else if (entry.kind === 'directory' && !entry.name.startsWith('.')) {
        const subDir = await dirHandle.getDirectoryHandle(entry.name)
        const subPath = folderPath ? `${folderPath}/${entry.name}` : entry.name
        await this.scanDirectory(subDir, subPath, notes)
      }
    }
  }

  private async collectFolders(
    dirHandle: FileSystemDirectoryHandle,
    prefix: string,
    folders: string[],
  ): Promise<void> {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'directory' && !entry.name.startsWith('.')) {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name
        folders.push(path)
        const subDir = await dirHandle.getDirectoryHandle(entry.name)
        await this.collectFolders(subDir, path, folders)
      }
    }
  }

  private async getOrCreateDir(
    root: FileSystemDirectoryHandle,
    path: string,
  ): Promise<FileSystemDirectoryHandle> {
    const parts = path.split('/').filter(Boolean)
    let current = root
    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create: true })
    }
    return current
  }

  private async detectChanges(): Promise<Note[] | null> {
    if (!this.rootHandle) return null
    const currentNotes: Note[] = []
    const currentPaths = new Set<string>()

    await this.scanForChanges(this.rootHandle, '', currentNotes, currentPaths)

    // Check if anything changed
    if (currentNotes.length > 0) {
      // Rebuild fileMap and scanMap
      this.fileMap.clear()
      for (const note of currentNotes) {
        const folderPath = note.folderPath || ''
        const filename = noteToFilename(note)
        const dir = folderPath
          ? await this.getOrCreateDir(this.rootHandle, folderPath)
          : this.rootHandle
        this.fileMap.set(note.id, { dirHandle: dir, filename, folderPath })
      }
      return currentNotes
    }
    return null
  }

  private async scanForChanges(
    dirHandle: FileSystemDirectoryHandle,
    folderPath: string,
    notes: Note[],
    paths: Set<string>,
  ): Promise<void> {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.md')) {
        const fullPath = folderPath ? `${folderPath}/${entry.name}` : entry.name
        paths.add(fullPath)
        try {
          const fileHandle = await dirHandle.getFileHandle(entry.name)
          const file = await fileHandle.getFile()
          const lastKnown = this.lastScanMap.get(fullPath)

          // Only parse if file is new or modified
          if (lastKnown === undefined || file.lastModified > lastKnown) {
            const text = await file.text()
            const note = parseNoteFile(text)
            note.folderPath = folderPath
            notes.push(note)
            this.lastScanMap.set(fullPath, file.lastModified)
          }
        } catch {
          // Skip unreadable
        }
      } else if (entry.kind === 'directory' && !entry.name.startsWith('.')) {
        const subDir = await dirHandle.getDirectoryHandle(entry.name)
        const subPath = folderPath ? `${folderPath}/${entry.name}` : entry.name
        await this.scanForChanges(subDir, subPath, notes, paths)
      }
    }
  }
}
