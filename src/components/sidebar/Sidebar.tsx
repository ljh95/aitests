import { useUIStore } from '@/store/uiStore'
import { useCategoryCount } from '@/hooks/useSearch'
import CategoryFilter from './CategoryFilter'
import FileTreeView from './FileTreeView'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const sidebarView = useUIStore((s) => s.sidebarView)
  const setSidebarView = useUIStore((s) => s.setSidebarView)
  const counts = useCategoryCount()

  return (
    <aside className={styles.sidebar}>
      <div className={styles.viewToggle}>
        <button
          className={`${styles.viewBtn} ${sidebarView === 'category' ? styles.viewBtnActive : ''}`}
          onClick={() => setSidebarView('category')}
          title="카테고리별 보기"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zm8 0A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm-8 8A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm8 0A1.5 1.5 0 0110.5 9h3a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 13.5v-3z"/>
          </svg>
        </button>
        <button
          className={`${styles.viewBtn} ${sidebarView === 'folder' ? styles.viewBtnActive : ''}`}
          onClick={() => setSidebarView('folder')}
          title="폴더별 보기"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 3.5A1.5 1.5 0 012.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0115 5.5v7a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 12.5v-9z"/>
          </svg>
        </button>
      </div>

      {sidebarView === 'category' && <CategoryFilter counts={counts} />}

      <FileTreeView />
    </aside>
  )
}
