import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import type { Note } from '@/types/note'
import type { StorageBackend } from './types'
import { serializeNote, parseNoteFile, noteToFilename, noteToTranslationFilename } from './frontmatter'

const VAULT_DIR = 'KAB'

export class CapacitorFsBackend implements StorageBackend {
  readonly type = 'filesystem' as const
  private vaultPath: string
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private lastScanMap = new Map<string, number>()

  constructor(vaultPath: string = VAULT_DIR) {
    this.vaultPath = vaultPath
  }

  static isSupported(): boolean {
    return Capacitor.isNativePlatform()
  }

  async initialize(): Promise<void> {
    // Ensure vault root directory exists
    await this.ensureDir(this.vaultPath)
  }

  async loadAllNotes(): Promise<Note[]> {
    this.lastScanMap.clear()
    const notes: Note[] = []
    await this.scanDirectory(this.vaultPath, '', notes)
    return notes
  }

  async saveNote(note: Note): Promise<void> {
    const filename = noteToFilename(note)
    const folderPath = note.folderPath || ''
    const dirPath = folderPath
      ? `${this.vaultPath}/${folderPath}`
      : this.vaultPath

    await this.ensureDir(dirPath)

    const filePath = `${dirPath}/${filename}`
    const data = serializeNote(note)

    await Filesystem.writeFile({
      path: filePath,
      data,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    })

    // Write or remove translation sidecar (.ko.md)
    const koFilename = noteToTranslationFilename(note)
    const koPath = `${dirPath}/${koFilename}`
    if (note.translatedContent) {
      await Filesystem.writeFile({
        path: koPath,
        data: note.translatedContent,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      })
    } else {
      try { await Filesystem.deleteFile({ path: koPath, directory: Directory.Documents }) } catch {}
    }

    this.lastScanMap.set(folderPath ? `${folderPath}/${filename}` : filename, Date.now())
  }

  async deleteNote(id: string): Promise<void> {
    // Find the note file by scanning
    const notes = await this.loadAllNotes()
    const note = notes.find((n) => n.id === id)
    if (!note) return

    const filename = noteToFilename(note)
    const folderPath = note.folderPath || ''
    const dirPath = folderPath
      ? `${this.vaultPath}/${folderPath}`
      : this.vaultPath

    try { await Filesystem.deleteFile({ path: `${dirPath}/${filename}`, directory: Directory.Documents }) } catch {}
    const koFilename = noteToTranslationFilename(note)
    try { await Filesystem.deleteFile({ path: `${dirPath}/${koFilename}`, directory: Directory.Documents }) } catch {}
  }

  async listFolders(): Promise<string[]> {
    const folders: string[] = []
    await this.collectFolders(this.vaultPath, '', folders)
    return folders.sort()
  }

  async createFolder(path: string): Promise<void> {
    await this.ensureDir(`${this.vaultPath}/${path}`)
  }

  async deleteFolder(path: string): Promise<void> {
    try {
      await Filesystem.rmdir({
        path: `${this.vaultPath}/${path}`,
        directory: Directory.Documents,
        recursive: true,
      })
    } catch {
      // Folder may already be deleted
    }
  }

  async getStorageInfo(): Promise<{ used: number; limit: number; location: string }> {
    let used = 0
    try {
      used = await this.calcDirSize(this.vaultPath)
    } catch {
      // Ignore
    }
    return {
      used,
      limit: Infinity,
      location: `Vault: Documents/${this.vaultPath}`,
    }
  }

  startPolling(onChanges: (notes: Note[]) => void): void {
    this.stopPolling()
    this.pollTimer = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      try {
        const notes: Note[] = []
        let hasChanges = false
        await this.scanDirectoryForChanges(this.vaultPath, '', notes, () => {
          hasChanges = true
        })
        if (hasChanges) {
          // Full rescan on change detected
          const allNotes = await this.loadAllNotes()
          onChanges(allNotes)
        }
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
    this.lastScanMap.clear()
  }

  getVaultPath(): string {
    return this.vaultPath
  }

  // --- Private helpers ---

  private async ensureDir(path: string): Promise<void> {
    try {
      await Filesystem.mkdir({
        path,
        directory: Directory.Documents,
        recursive: true,
      })
    } catch {
      // Directory may already exist
    }
  }

  private async scanDirectory(
    dirPath: string,
    folderPath: string,
    notes: Note[],
  ): Promise<void> {
    try {
      const result = await Filesystem.readdir({
        path: dirPath,
        directory: Directory.Documents,
      })

      for (const entry of result.files) {
        if (entry.type === 'file' && entry.name.endsWith('.md') && !entry.name.endsWith('.ko.md')) {
          try {
            const filePath = `${dirPath}/${entry.name}`
            const file = await Filesystem.readFile({
              path: filePath,
              directory: Directory.Documents,
              encoding: Encoding.UTF8,
            })
            const text = typeof file.data === 'string' ? file.data : ''
            const note = parseNoteFile(text)
            note.folderPath = folderPath || undefined

            // Load translation sidecar if exists
            const koPath = `${dirPath}/${entry.name.replace(/\.md$/, '.ko.md')}`
            try {
              const koFile = await Filesystem.readFile({
                path: koPath,
                directory: Directory.Documents,
                encoding: Encoding.UTF8,
              })
              const koText = typeof koFile.data === 'string' ? koFile.data : ''
              if (koText) note.translatedContent = koText
            } catch { /* no translation file */ }

            notes.push(note)

            const relativePath = folderPath ? `${folderPath}/${entry.name}` : entry.name
            this.lastScanMap.set(relativePath, entry.mtime || Date.now())
          } catch {
            // Skip unreadable files
          }
        } else if (entry.type === 'directory' && !entry.name.startsWith('.')) {
          const subPath = folderPath ? `${folderPath}/${entry.name}` : entry.name
          await this.scanDirectory(`${dirPath}/${entry.name}`, subPath, notes)
        }
      }
    } catch {
      // Directory may not exist yet
    }
  }

  private async scanDirectoryForChanges(
    dirPath: string,
    folderPath: string,
    notes: Note[],
    onChangeDetected: () => void,
  ): Promise<void> {
    try {
      const result = await Filesystem.readdir({
        path: dirPath,
        directory: Directory.Documents,
      })

      for (const entry of result.files) {
        if (entry.type === 'file' && entry.name.endsWith('.md')) {
          // .ko.md changes also trigger rescan
          const relativePath = folderPath ? `${folderPath}/${entry.name}` : entry.name
          const lastKnown = this.lastScanMap.get(relativePath)
          const mtime = entry.mtime || 0
          if (lastKnown === undefined || mtime > lastKnown) {
            onChangeDetected()
            return
          }
        } else if (entry.type === 'directory' && !entry.name.startsWith('.')) {
          const subPath = folderPath ? `${folderPath}/${entry.name}` : entry.name
          await this.scanDirectoryForChanges(
            `${dirPath}/${entry.name}`,
            subPath,
            notes,
            onChangeDetected,
          )
        }
      }
    } catch {
      // Ignore
    }
  }

  private async collectFolders(
    dirPath: string,
    prefix: string,
    folders: string[],
  ): Promise<void> {
    try {
      const result = await Filesystem.readdir({
        path: dirPath,
        directory: Directory.Documents,
      })

      for (const entry of result.files) {
        if (entry.type === 'directory' && !entry.name.startsWith('.')) {
          const path = prefix ? `${prefix}/${entry.name}` : entry.name
          folders.push(path)
          await this.collectFolders(`${dirPath}/${entry.name}`, path, folders)
        }
      }
    } catch {
      // Directory may not exist
    }
  }

  private async calcDirSize(dirPath: string): Promise<number> {
    let size = 0
    try {
      const result = await Filesystem.readdir({
        path: dirPath,
        directory: Directory.Documents,
      })
      for (const entry of result.files) {
        if (entry.type === 'file') {
          size += entry.size || 0
        } else if (entry.type === 'directory') {
          size += await this.calcDirSize(`${dirPath}/${entry.name}`)
        }
      }
    } catch {
      // Ignore
    }
    return size
  }
}
