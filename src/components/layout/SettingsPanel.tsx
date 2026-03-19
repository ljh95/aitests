import { useRef } from 'react'
import { useNoteStore } from '@/store/noteStore'
import { getStorageUsage } from '@/storage/localStorage'
import {
  exportNotesAsJson,
  importNotesFromJson,
  downloadFile,
  readFileAsText,
} from '@/lib/export'
import styles from './SettingsPanel.module.css'

interface Props {
  onClose: () => void
}

export default function SettingsPanel({ onClose }: Props) {
  const notes = useNoteStore((s) => s.notes)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { used, limit } = getStorageUsage()
  const usedKB = (used / 1024).toFixed(1)
  const limitKB = (limit / 1024).toFixed(0)
  const pct = ((used / limit) * 100).toFixed(1)

  const handleExport = () => {
    const json = exportNotesAsJson(notes)
    const date = new Date().toISOString().slice(0, 10)
    downloadFile(json, `kab-backup-${date}.json`)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await readFileAsText(file)
    const imported = importNotesFromJson(text)
    if (!imported) {
      alert('Invalid file format. Expected a KAB JSON backup.')
      return
    }
    // Merge: add imported notes that don't exist by id
    const existingIds = new Set(notes.map((n) => n.id))
    const newNotes = imported.filter((n) => !existingIds.has(n.id))
    if (newNotes.length === 0) {
      alert('No new notes to import. All notes already exist.')
      return
    }
    const store = useNoteStore.getState()
    for (const n of newNotes) {
      // Directly add to store
      useNoteStore.setState({
        notes: [n, ...useNoteStore.getState().notes],
      })
    }
    // Trigger save
    store.updateNote(newNotes[0]!.id, {})
    alert(`Imported ${newNotes.length} new note(s).`)
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Settings</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Storage</h3>
          <div className={styles.storageBar}>
            <div className={styles.storageUsed} style={{ width: `${pct}%` }} />
          </div>
          <p className={styles.storageText}>
            {usedKB} KB / {limitKB} KB ({pct}%) — {notes.length} notes
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Data</h3>
          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={handleExport}>
              Export All (JSON)
            </button>
            <button
              className={styles.actionBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              Import (JSON)
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Shortcuts</h3>
          <div className={styles.shortcutList}>
            <div className={styles.shortcut}>
              <kbd>Cmd+N</kbd> <span>New note</span>
            </div>
            <div className={styles.shortcut}>
              <kbd>Cmd+E</kbd> <span>Toggle edit/preview</span>
            </div>
            <div className={styles.shortcut}>
              <kbd>Cmd+Shift+C</kbd> <span>AI Copy panel</span>
            </div>
            <div className={styles.shortcut}>
              <kbd>Cmd+K</kbd> <span>Focus search</span>
            </div>
            <div className={styles.shortcut}>
              <kbd>Esc</kbd> <span>Close panels</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
