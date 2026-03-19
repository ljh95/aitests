import { useNoteStore } from '@/store/noteStore'
import type { Category } from '@/types/note'
import styles from './CategoryFilter.module.css'

const categories: { key: Category | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'study', label: 'Study' },
  { key: 'code', label: 'Code' },
  { key: 'life', label: 'Life' },
  { key: 'idea', label: 'Idea' },
]

interface Props {
  counts: Record<string, number>
}

export default function CategoryFilter({ counts }: Props) {
  const categoryFilter = useNoteStore((s) => s.categoryFilter)
  const setCategoryFilter = useNoteStore((s) => s.setCategoryFilter)

  return (
    <div className={styles.wrap}>
      {categories.map(({ key, label }) => (
        <button
          key={key}
          className={`${styles.pill} ${
            (key === 'all' && !categoryFilter) || key === categoryFilter
              ? styles.active
              : ''
          }`}
          onClick={() => setCategoryFilter(key === 'all' ? null : key)}
        >
          {label}
          <span className={styles.count}>{counts[key] ?? 0}</span>
        </button>
      ))}
    </div>
  )
}
