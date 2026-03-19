import { useNoteStore } from '@/store/noteStore'
import { useFilteredNotes, useCategoryCount } from '@/hooks/useSearch'
import NoteListItem from './NoteListItem'
import CategoryFilter from './CategoryFilter'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const activeNoteId = useNoteStore((s) => s.activeNoteId)
  const setActiveNote = useNoteStore((s) => s.setActiveNote)
  const deleteNote = useNoteStore((s) => s.deleteNote)
  const filteredNotes = useFilteredNotes()
  const counts = useCategoryCount()

  return (
    <aside className={styles.sidebar}>
      <CategoryFilter counts={counts} />
      <div className={styles.list}>
        {filteredNotes.length === 0 ? (
          <div className={styles.empty}>No notes found</div>
        ) : (
          filteredNotes.map((note) => (
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
