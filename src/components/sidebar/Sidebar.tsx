import { useNoteStore } from '@/store/noteStore'
import { useFilteredNotes, useCategoryCount } from '@/hooks/useSearch'
import NoteListItem from './NoteListItem'
import CategoryFilter from './CategoryFilter'
import FolderTree from './FolderTree'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const activeNoteId = useNoteStore((s) => s.activeNoteId)
  const setActiveNote = useNoteStore((s) => s.setActiveNote)
  const deleteNote = useNoteStore((s) => s.deleteNote)
  const storageMode = useNoteStore((s) => s.storageMode)
  const currentFolder = useNoteStore((s) => s.currentFolder)
  const filteredNotes = useFilteredNotes()
  const counts = useCategoryCount()

  // In filesystem mode, further filter by current folder
  const displayNotes =
    storageMode === 'filesystem' && currentFolder
      ? filteredNotes.filter((n) => n.folderPath === currentFolder)
      : filteredNotes

  return (
    <aside className={styles.sidebar}>
      <CategoryFilter counts={counts} />
      {storageMode === 'filesystem' && <FolderTree />}
      <div className={styles.list}>
        {displayNotes.length === 0 ? (
          <div className={styles.empty}>No notes found</div>
        ) : (
          displayNotes.map((note) => (
            <NoteListItem
              key={note.id}
              note={note}
              isActive={note.id === activeNoteId}
              onClick={() => setActiveNote(note.id)}
              onDelete={() => deleteNote(note.id)}
            />
          ))
        )}
      </div>
    </aside>
  )
}
