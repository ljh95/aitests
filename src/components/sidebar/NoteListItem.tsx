import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Note } from '@/types/note'
import styles from './NoteListItem.module.css'

const categoryColors: Record<string, string> = {
  study: '#569cd6',
  code: '#4ec9b0',
  life: '#dcdcaa',
  idea: '#c586c0',
}

interface Props {
  note: Note
  isActive: boolean
  onClick: () => void
  onDelete: () => void
}

export default function NoteListItem({ note, isActive, onClick, onDelete }: Props) {
  const preview = note.content
    .replace(/^#+\s.*/gm, '')
    .replace(/[`*_~\[\]]/g, '')
    .trim()
    .slice(0, 80)

  return (
    <div
      className={`${styles.item} ${isActive ? styles.active : ''}`}
      onClick={onClick}
    >
      <div className={styles.top}>
        <span className={styles.title}>
          {note.isPinned && <span className={styles.pin}>*</span>}
          {note.title || 'Untitled'}
        </span>
        <button
          className={styles.deleteBtn}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          title="Delete note"
        >
          &times;
        </button>
      </div>
      <div className={styles.preview}>{preview || 'Empty note'}</div>
      <div className={styles.meta}>
        <span
          className={styles.category}
          style={{ color: categoryColors[note.category] }}
        >
          {note.category}
        </span>
        <span className={styles.date}>
          {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true, locale: ko })}
        </span>
      </div>
    </div>
  )
}
