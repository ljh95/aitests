import { useNoteStore } from '@/store/noteStore'
import type { Category } from '@/types/note'
import { format } from 'date-fns'
import styles from './NoteMetaBar.module.css'

const categories: Category[] = ['study', 'code', 'life', 'idea']

export default function NoteMetaBar() {
  const notes = useNoteStore((s) => s.notes)
  const activeNoteId = useNoteStore((s) => s.activeNoteId)
  const updateNote = useNoteStore((s) => s.updateNote)

  const note = notes.find((n) => n.id === activeNoteId)
  if (!note) return null

  return (
    <div className={styles.bar}>
      <input
        className={styles.titleInput}
        type="text"
        placeholder="Note title..."
        value={note.title}
        onChange={(e) => updateNote(note.id, { title: e.target.value })}
      />
      <div className={styles.meta}>
        <select
          className={styles.categorySelect}
          value={note.category}
          onChange={(e) => updateNote(note.id, { category: e.target.value as Category })}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className={styles.date}>
          {format(new Date(note.updatedAt), 'yyyy-MM-dd HH:mm')}
        </span>
      </div>
    </div>
  )
}
