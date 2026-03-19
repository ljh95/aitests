import { useUIStore } from '@/store/uiStore'
import { useNoteStore } from '@/store/noteStore'
import Header from './Header'
import Sidebar from '../sidebar/Sidebar'
import NoteMetaBar from '../editor/NoteMetaBar'
import MarkdownEditor from '../editor/MarkdownEditor'
import MarkdownPreview from '../preview/MarkdownPreview'
import AICopyPanel from '../ai-copy/AICopyPanel'
import styles from './AppShell.module.css'

export default function AppShell() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const viewMode = useUIStore((s) => s.viewMode)
  const aiCopyPanelOpen = useUIStore((s) => s.aiCopyPanelOpen)
  const setAICopyPanelOpen = useUIStore((s) => s.setAICopyPanelOpen)
  const activeNoteId = useNoteStore((s) => s.activeNoteId)

  return (
    <div className={styles.shell}>
      <Header />
      <div className={styles.body}>
        {sidebarOpen && (
          <div className={styles.sidebar}>
            <Sidebar />
          </div>
        )}
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
