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
import { getApiKey, setApiKey } from '@/utils/geminiService'
import styles from './SettingsPanel.module.css'

type SyncPlatform = 'web' | 'android'

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
  const [geminiKey, setGeminiKey] = useState(getApiKey())
  const [showKey, setShowKey] = useState(false)

  const isNative = storageManager.isNativeFileSystemSupported()
  const detectedPlatform: SyncPlatform = isNative ? 'android' : 'web'
  const [syncTab, setSyncTab] = useState<SyncPlatform>(detectedPlatform)

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
                    {isNative
                      ? 'Vault 활성화 (Documents/KAB)'
                      : 'Vault 폴더 선택'}
                  </button>
                ) : (
                  <p className={styles.unsupported}>
                    Vault 모드는 Chrome, Edge 또는 네이티브 앱이 필요합니다.
                  </p>
                )}
              </>
            ) : (
              <>
                <button className={styles.actionBtn} onClick={handleDisconnectVault}>
                  Vault 연결 해제
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
              Google Drive Sync
            </h3>
            <span className={styles.guideToggle}>
              {showSyncGuide ? '\u25B2' : '\u25BC'}
            </span>
          </div>

          {showSyncGuide && (
            <div className={styles.guideContent}>
              <div className={styles.platformTabs}>
                <button
                  className={styles.platformTab}
                  data-active={syncTab === 'android'}
                  onClick={() => setSyncTab('android')}
                >
                  Android
                  {detectedPlatform === 'android' && (
                    <span className={styles.currentBadge}>현재</span>
                  )}
                </button>
                <button
                  className={styles.platformTab}
                  data-active={syncTab === 'web'}
                  onClick={() => setSyncTab('web')}
                >
                  PC / Web
                  {detectedPlatform === 'web' && (
                    <span className={styles.currentBadge}>현재</span>
                  )}
                </button>
              </div>

              {syncTab === 'android' && (
                <div className={styles.guideBlock}>
                  <div className={styles.syncOverview}>
                    <p className={styles.syncDesc}>
                      Vault 폴더를 Google Drive와 자동 동기화하여
                      PC에서 작성한 노트를 휴대폰에서도 확인할 수 있습니다.
                    </p>
                  </div>

                  <div className={styles.stepCard}>
                    <div className={styles.stepNumber}>1</div>
                    <div className={styles.stepBody}>
                      <strong>Vault 활성화</strong>
                      <p>
                        위 Storage 섹션에서 <strong>Enable Vault</strong>를 눌러
                        Vault 모드를 켜세요.
                      </p>
                      <span className={styles.guidePath}>
                        저장 위치: 내 파일/Documents/KAB/
                      </span>
                    </div>
                  </div>

                  <div className={styles.stepCard}>
                    <div className={styles.stepNumber}>2</div>
                    <div className={styles.stepBody}>
                      <strong>Autosync for Google Drive 설치</strong>
                      <p>
                        Play Store에서{' '}
                        <strong>Autosync for Google Drive</strong>를
                        설치하고 Google 계정으로 로그인하세요.
                      </p>
                      <span className={styles.guideNote}>
                        무료 버전으로 충분합니다 (폴더 1쌍 동기화 지원)
                      </span>
                    </div>
                  </div>

                  <div className={styles.stepCard}>
                    <div className={styles.stepNumber}>3</div>
                    <div className={styles.stepBody}>
                      <strong>동기화 폴더 연결</strong>
                      <p>Autosync에서 새 동기화 쌍을 추가하세요:</p>
                      <div className={styles.guideTable}>
                        <div className={styles.guideTableRow}>
                          <span className={styles.guideTableLabel}>로컬 폴더</span>
                          <span className={styles.guideTableValue}>/Documents/KAB/</span>
                        </div>
                        <div className={styles.guideTableRow}>
                          <span className={styles.guideTableLabel}>Drive 폴더</span>
                          <span className={styles.guideTableValue}>KAB-Vault/</span>
                        </div>
                        <div className={styles.guideTableRow}>
                          <span className={styles.guideTableLabel}>동기화 방식</span>
                          <span className={styles.guideTableValue}>양방향 (Two-way)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className={styles.guideTip}>
                    설정 완료 후 Autosync가 백그라운드에서 자동으로
                    Google Drive와 동기화합니다.
                    PC에서 작성한 노트가 자동으로 휴대폰에 반영됩니다.
                  </p>
                </div>
              )}

              {syncTab === 'web' && (
                <div className={styles.guideBlock}>
                  <div className={styles.syncOverview}>
                    <p className={styles.syncDesc}>
                      Google Drive 데스크톱 앱으로 Vault 폴더를 자동 동기화하세요.
                      노트가 <code>.md</code> 파일로 저장되어 어디서든 접근 가능합니다.
                    </p>
                  </div>

                  <div className={styles.stepCard}>
                    <div className={styles.stepNumber}>1</div>
                    <div className={styles.stepBody}>
                      <strong>Google Drive 데스크톱 설치</strong>
                      <p>
                        <a
                          href="https://www.google.com/drive/download/"
                          target="_blank"
                          rel="noreferrer"
                          className={styles.guideLink}
                        >
                          Google Drive 데스크톱 앱
                        </a>
                        을 설치하면 내 PC에 Drive 폴더가 생깁니다.
                      </p>
                      <span className={styles.guidePath}>
                        Mac: ~/Google Drive/ &nbsp;|&nbsp; Win: G:\My Drive\
                      </span>
                    </div>
                  </div>

                  <div className={styles.stepCard}>
                    <div className={styles.stepNumber}>2</div>
                    <div className={styles.stepBody}>
                      <strong>Vault 폴더 생성</strong>
                      <p>
                        Google Drive 안에 노트 전용 폴더를 만드세요.
                      </p>
                      <span className={styles.guidePath}>
                        예: Google Drive/KAB-Vault/
                      </span>
                    </div>
                  </div>

                  <div className={styles.stepCard}>
                    <div className={styles.stepNumber}>3</div>
                    <div className={styles.stepBody}>
                      <strong>Vault 연결</strong>
                      <p>
                        위 Storage 섹션에서{' '}
                        <strong>Open Vault Folder</strong>를 클릭하고
                        방금 만든 폴더를 선택하세요.
                      </p>
                    </div>
                  </div>

                  <p className={styles.guideTip}>
                    노트를 저장하면 Google Drive가 자동으로 클라우드에 동기화합니다.
                    Android 앱에서도 같은 폴더를 연결하면 양방향 동기화됩니다.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Gemini API</h3>
          <p className={styles.storageText} style={{ marginBottom: 8 }}>
            이미지, PDF, 음성, 비디오, YouTube를 마크다운으로 변환하려면 Gemini API 키가 필요합니다.
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className={styles.apiKeyInput}
              type={showKey ? 'text' : 'password'}
              placeholder="Gemini API Key"
              value={geminiKey}
              onChange={(e) => {
                setGeminiKey(e.target.value)
                setApiKey(e.target.value)
              }}
              style={{
                flex: 1,
                padding: '6px 10px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontSize: 12,
              }}
            />
            <button
              className={styles.actionBtn}
              onClick={() => setShowKey(!showKey)}
              style={{ padding: '6px 10px', fontSize: 11 }}
            >
              {showKey ? '숨기기' : '보기'}
            </button>
          </div>
          {geminiKey && (
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#22c55e' }}>
              API 키 설정됨
            </p>
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
