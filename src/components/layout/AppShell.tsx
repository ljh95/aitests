import { useUIStore } from '@/store/uiStore'
import { useNoteStore } from '@/store/noteStore'
import { useEffect, useCallback } from 'react'
import Header from './Header'
import Sidebar from '../sidebar/Sidebar'
import NoteMetaBar from '../editor/NoteMetaBar'
import MarkdownEditor from '../editor/MarkdownEditor'
import MarkdownPreview from '../preview/MarkdownPreview'
import AICopyPanel from '../ai-copy/AICopyPanel'
import styles from './AppShell.module.css'

const isMobile = () => window.innerWidth <= 768

export default function AppShell() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)
  const viewMode = useUIStore((s) => s.viewMode)
  const aiCopyPanelOpen = useUIStore((s) => s.aiCopyPanelOpen)
  const setAICopyPanelOpen = useUIStore((s) => s.setAICopyPanelOpen)
  const activeNoteId = useNoteStore((s) => s.activeNoteId)
  const storageReady = useNoteStore((s) => s.storageReady)
  const hydrate = useNoteStore((s) => s.hydrate)

  // Hydrate storage on mount
  useEffect(() => {
    hydrate()
  }, [hydrate])

  // 모바일에서 노트 선택 시 사이드바 자동 닫기
  useEffect(() => {
    if (activeNoteId && isMobile()) {
      setSidebarOpen(false)
    }
  }, [activeNoteId, setSidebarOpen])

  const handleOverlayClick = useCallback(() => {
    setSidebarOpen(false)
  }, [setSidebarOpen])

  if (!storageReady) {
    return (
      <div className={styles.shell}>
        <div className={styles.loading}>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.shell}>
      <Header />
      <div className={styles.body}>
        {/* 모바일 오버레이 */}
        <div
          className={`${styles.overlay} ${sidebarOpen ? styles.overlayVisible : ''}`}
          onClick={handleOverlayClick}
        />
        {/* 사이드바: 항상 DOM에 존재, CSS로 슬라이드 */}
        <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <Sidebar />
        </div>
        <div className={styles.main}>
          <main className={styles.content}>
            {activeNoteId ? (
              <>
                <NoteMetaBar />
                <div className={styles.editorWrap}>
                  {viewMode === 'edit' ? <MarkdownEditor /> : <MarkdownPreview />}
                </div>
                {viewMode === 'preview' && !aiCopyPanelOpen && (
                  <button
                    className={styles.aiCopyFab}
                    onClick={() => setAICopyPanelOpen(true)}
                    title="AI Copy (Cmd+Shift+C)"
                  >
                    AI Copy
                  </button>
                )}
              </>
            ) : (
              <div className={styles.empty}>
                <p>Select a note or press <kbd>Cmd+N</kbd> to create one</p>
              </div>
            )}
          </main>
          {aiCopyPanelOpen && <AICopyPanel />}
        </div>
      </div>
    </div>
  )
}
