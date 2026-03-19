import { useRef, useState } from 'react'
import { useNoteStore } from '@/store/noteStore'
import { useUIStore } from '@/store/uiStore'
import { storageManager } from '@/storage/storageManager'
import {
  exportNotesAsJson,
  importNotesFromJson,
  downloadFile,
  readFileAsText,
} from '@/lib/export'
import styles from './SettingsPanel.module.css'

interface Props {
  onClose: () => void
}

export default function SettingsPanel({ onClose }: Props) {
  const notes = useNoteStore((s) => s.notes)
  const storageMode = useNoteStore((s) => s.storageMode)
  const switchToFilesystem = useNoteStore((s) => s.switchToFilesystem)
  const switchToLocalStorage = useNoteStore((s) => s.switchToLocalStorage)
  const migrateToFilesystem = useNoteStore((s) => s.migrateToFilesystem)
  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [migrating, setMigrating] = useState(false)
  const [migrateResult, setMigrateResult] = useState<string | null>(null)
  const [showSyncGuide, setShowSyncGuide] = useState(false)

  const isVaultSupported = storageManager.isVaultSupported()

  const handleExport = () => {
    const json = exportNotesAsJson(notes)
    const date = new Date().toISOString().slice(0, 10)
    downloadFile(json, `kab-backup-${date}.json`)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await readFileAsText(file)
    const imported = importNotesFromJson(text)
    if (!imported) {
      alert('Invalid file format. Expected a KAB JSON backup.')
      return
    }
    const existingIds = new Set(notes.map((n) => n.id))
    const newNotes = imported.filter((n) => !existingIds.has(n.id))
    if (newNotes.length === 0) {
      alert('No new notes to import. All notes already exist.')
      return
    }
    const store = useNoteStore.getState()
    for (const n of newNotes) {
      useNoteStore.setState({
        notes: [n, ...useNoteStore.getState().notes],
      })
    }
    store.updateNote(newNotes[0]!.id, {})
    alert(`Imported ${newNotes.length} new note(s).`)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleOpenVault = async () => {
    try {
      await switchToFilesystem()
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      console.error('Failed to open vault:', e)
      alert('Failed to open vault folder.')
    }
  }

  const handleDisconnectVault = async () => {
    if (!confirm('Disconnect vault and switch back to browser storage?')) return
    await switchToLocalStorage()
  }

  const handleMigrate = async () => {
    if (!confirm('Migrate all current notes to the vault folder as .md files?')) return
    setMigrating(true)
    setMigrateResult(null)
    try {
      const count = await migrateToFilesystem()
      setMigrateResult(`Successfully migrated ${count} note(s) to vault.`)
    } catch (e) {
      console.error('Migration failed:', e)
      setMigrateResult('Migration failed. Please try again.')
    } finally {
      setMigrating(false)
    }
  }

  const getStorageInfo = () => {
    if (storageMode === 'filesystem') {
      const fsBackend = storageManager.getFileSystemBackend()
      const capBackend = storageManager.getCapacitorFsBackend()
      const name = fsBackend?.getRootHandle()?.name
        ?? (capBackend ? `Documents/${capBackend.getVaultPath()}` : 'Vault')
      return { location: name, noteCount: notes.length }
    }
    let used = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) used += localStorage.getItem(key)?.length ?? 0
    }
    const usedBytes = used * 2
    const limit = 5 * 1024 * 1024
    return {
      usedKB: (usedBytes / 1024).toFixed(1),
      limitKB: (limit / 1024).toFixed(0),
      pct: ((usedBytes / limit) * 100).toFixed(1),
      noteCount: notes.length,
    }
  }

  const storageInfo = getStorageInfo()

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Settings</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Theme</h3>
          <div className={styles.themeToggle}>
            <span className={styles.themeLabel}>
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
            <div
              className={styles.themeSwitch}
              data-active={theme === 'light'}
              onClick={toggleTheme}
            >
              <div className={styles.themeSwitchKnob} />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Storage</h3>

          <div className={styles.storageMode}>
            <span className={styles.modeLabel}>
              {storageMode === 'filesystem' ? (
                <>
                  <span className={styles.modeBadge} data-mode="vault">Vault</span>
                  {'location' in storageInfo && storageInfo.location}
                </>
              ) : (
                <>
                  <span className={styles.modeBadge} data-mode="local">Local</span>
                  Browser Storage
                </>
              )}
            </span>
            <span className={styles.noteCount}>
              {storageInfo.noteCount} notes
            </span>
          </div>

          {storageMode === 'localStorage' && 'pct' in storageInfo && (
            <>
              <div className={styles.storageBar}>
                <div className={styles.storageUsed} style={{ width: `${storageInfo.pct}%` }} />
              </div>
              <p className={styles.storageText}>
                {storageInfo.usedKB} KB / {storageInfo.limitKB} KB ({storageInfo.pct}%)
              </p>
            </>
          )}

          <div className={styles.actions} style={{ marginTop: 10 }}>
            {storageMode === 'localStorage' ? (
              <>
                {isVaultSupported ? (
                  <button className={styles.actionBtn} onClick={handleOpenVault}>
                    {storageManager.isNativeFileSystemSupported()
                      ? 'Enable Vault (Documents/KAB)'
                      : 'Open Vault Folder'}
                  </button>
                ) : (
                  <p className={styles.unsupported}>
                    Vault mode requires Chrome, Edge, or a native app.
                  </p>
                )}
              </>
            ) : (
              <>
                <button className={styles.actionBtn} onClick={handleDisconnectVault}>
                  Disconnect Vault
                </button>
              </>
            )}
          </div>

          {storageMode === 'filesystem' && (
            <div style={{ marginTop: 8 }}>
              <button
                className={styles.actionBtn}
                onClick={handleMigrate}
                disabled={migrating}
              >
                {migrating ? 'Migrating...' : 'Migrate localStorage Notes'}
              </button>
              {migrateResult && (
                <p className={styles.storageText} style={{ marginTop: 6 }}>
                  {migrateResult}
                </p>
              )}
            </div>
          )}
        </div>

        <div className={styles.section}>
          <div
            className={styles.guideTitleRow}
            onClick={() => setShowSyncGuide(!showSyncGuide)}
          >
            <h3 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
              Cloud Sync Guide
            </h3>
            <span className={styles.guideToggle}>
              {showSyncGuide ? '\u25B2' : '\u25BC'}
            </span>
          </div>

          {showSyncGuide && (
            <div className={styles.guideContent}>
              <div className={styles.guideBlock}>
                <h4 className={styles.guideSubtitle}>
                  PC/Mac — Web에서 Vault 설정
                </h4>
                <ol className={styles.guideSteps}>
                  <li>
                    <a
                      href="https://www.google.com/drive/download/"
                      target="_blank"
                      rel="noreferrer"
                      className={styles.guideLink}
                    >
                      Google Drive 데스크톱 앱
                    </a>
                    을 설치하세요.
                  </li>
                  <li>
                    설치 후 내 PC에 Google Drive 폴더가 생깁니다.
                    <br />
                    <span className={styles.guidePath}>
                      Mac: ~/Google Drive/ &nbsp;|&nbsp; Win: G:\My Drive\
                    </span>
                  </li>
                  <li>
                    그 안에 노트 전용 폴더를 만드세요.
                    <br />
                    <span className={styles.guidePath}>
                      예: Google Drive/KAB-Vault/
                    </span>
                  </li>
                  <li>
                    이 앱의 Settings &gt; Storage &gt;{' '}
                    <strong>Open Vault Folder</strong> 클릭 후
                    방금 만든 폴더를 선택하세요.
                  </li>
                  <li>
                    노트가 <code>.md</code> 파일로 저장되고,
                    Google Drive가 자동으로 클라우드에 동기화합니다.
                  </li>
                </ol>
              </div>

              <div className={styles.guideDivider} />

              <div className={styles.guideBlock}>
                <h4 className={styles.guideSubtitle}>
                  Android — 휴대폰에서 동기화
                </h4>
                <ol className={styles.guideSteps}>
                  <li>
                    이 앱의 Settings &gt; Storage &gt;{' '}
                    <strong>Enable Vault</strong>를 눌러
                    Vault 모드를 활성화하세요.
                    <br />
                    <span className={styles.guidePath}>
                      저장 위치: 내 파일/Documents/KAB/
                    </span>
                  </li>
                  <li>
                    Play Store에서{' '}
                    <strong>FolderSync</strong> 앱을 설치하세요.
                    <br />
                    <span className={styles.guideNote}>
                      (무료 버전으로 충분합니다)
                    </span>
                  </li>
                  <li>
                    FolderSync 앱을 열고 <strong>Accounts</strong> 탭에서
                    Google Drive 계정을 추가하세요.
                  </li>
                  <li>
                    <strong>Folderpairs</strong> 탭에서 새 동기화 쌍을 만드세요:
                    <div className={styles.guideTable}>
                      <div className={styles.guideTableRow}>
                        <span className={styles.guideTableLabel}>동기화 유형</span>
                        <span className={styles.guideTableValue}>양방향 (Two-way)</span>
                      </div>
                      <div className={styles.guideTableRow}>
                        <span className={styles.guideTableLabel}>원격 폴더</span>
                        <span className={styles.guideTableValue}>Google Drive/KAB-Vault/</span>
                      </div>
                      <div className={styles.guideTableRow}>
                        <span className={styles.guideTableLabel}>로컬 폴더</span>
                        <span className={styles.guideTableValue}>/Documents/KAB/</span>
                      </div>
                      <div className={styles.guideTableRow}>
                        <span className={styles.guideTableLabel}>동기화 주기</span>
                        <span className={styles.guideTableValue}>15분 (또는 원하는 주기)</span>
                      </div>
                    </div>
                  </li>
                  <li>
                    저장 후 <strong>Sync</strong> 버튼을 눌러 첫 동기화를 실행하세요.
                  </li>
                  <li>
                    이제 이 앱을 열면 PC에서 작성한 노트가 자동으로 보입니다.
                  </li>
                </ol>
              </div>

              <div className={styles.guideDivider} />

              <p className={styles.guideTip}>
                PC에서 노트를 수정하면 Google Drive가 자동 동기화하고,
                FolderSync가 주기적으로 휴대폰에 반영합니다.
                즉시 확인하려면 FolderSync에서 수동 Sync를 누르세요.
              </p>
            </div>
          )}
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Data</h3>
          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={handleExport}>
              Export All (JSON)
            </button>
            <button
              className={styles.actionBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              Import (JSON)
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Shortcuts</h3>
          <div className={styles.shortcutList}>
            <div className={styles.shortcut}>
              <kbd>Cmd+N</kbd> <span>New note</span>
            </div>
            <div className={styles.shortcut}>
              <kbd>Cmd+E</kbd> <span>Toggle edit/preview</span>
            </div>
            <div className={styles.shortcut}>
              <kbd>Cmd+Shift+C</kbd> <span>AI Copy panel</span>
            </div>
            <div className={styles.shortcut}>
              <kbd>Cmd+K</kbd> <span>Focus search</span>
            </div>
            <div className={styles.shortcut}>
              <kbd>Esc</kbd> <span>Close panels</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
