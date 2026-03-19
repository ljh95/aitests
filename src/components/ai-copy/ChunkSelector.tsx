import type { ChunkSelection } from '@/types/note'
import styles from './ChunkSelector.module.css'

interface Props {
  chunks: ChunkSelection[]
  onToggle: (index: number) => void
  onSelectAll: (selected: boolean) => void
}

export default function ChunkSelector({ chunks, onToggle, onSelectAll }: Props) {
  const allSelected = chunks.every((c) => c.selected)

  return (
    <div className={styles.wrap}>
      <div className={styles.actions}>
        <button
          className={styles.actionBtn}
          onClick={() => onSelectAll(!allSelected)}
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      {chunks.map((chunk, i) => (
        <label
          key={i}
          className={styles.chunk}
          style={{ paddingLeft: `${8 + chunk.level * 12}px` }}
        >
          <input
            type="checkbox"
            checked={chunk.selected}
            onChange={() => onToggle(i)}
            className={styles.checkbox}
          />
          <span className={styles.heading}>
            {chunk.level > 0 && (
              <span className={styles.level}>H{chunk.level}</span>
            )}
            {chunk.headingText}
          </span>
        </label>
      ))}
      {chunks.length === 0 && (
        <div className={styles.empty}>No headings found in this note</div>
      )}
    </div>
  )
}
