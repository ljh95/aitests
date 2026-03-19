import { useState } from 'react'
import { useNoteStore } from '@/store/noteStore'
import { useUIStore } from '@/store/uiStore'
import SettingsPanel from './SettingsPanel'
import styles from './Header.module.css'

export default function Header() {
  const createNote = useNoteStore((s) => s.createNote)
  const searchQuery = useNoteStore((s) => s.searchQuery)
  const setSearch = useNoteStore((s) => s.setSearch)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const viewMode = useUIStore((s) => s.viewMode)
  const toggleViewMode = useUIStore((s) => s.toggleViewMode)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <header className={styles.header}>
        <div className={styles.left}>
          <button className={styles.iconBtn} onClick={toggleSidebar} title="Toggle sidebar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <span className={styles.logo}>KAB</span>
        </div>

        <div className={styles.center}>
          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              id="kab-search"
              className={styles.searchInput}
              type="text"
              placeholder="Search notes... (Cmd+K)"
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
            />
            {searchQuery && (
              <button className={styles.clearBtn} onClick={() => setSearch('')}>
                &times;
              </button>
            )}
          </div>
        </div>

        <div className={styles.right}>
          <button className={styles.modeBtn} onClick={toggleViewMode}>
            {viewMode === 'edit' ? 'Preview' : 'Edit'}
          </button>
          <button className={styles.newBtn} onClick={() => createNote()}>
            + New
          </button>
          <button className={styles.iconBtn} onClick={() => setSettingsOpen(true)} title="Settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </>
  )
}
