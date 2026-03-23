import { useState, useRef, useEffect } from 'react'
import { useNoteStore } from '@/store/noteStore'
import { fetchUrlAsMarkdown } from '@/utils/urlFetcher'
import { processFile, hasApiKey, ACCEPTED_EXTENSIONS, detectFileType, isYouTubeUrl, processYouTubeUrl } from '@/utils/geminiService'
import styles from './NewNoteMenu.module.css'

type ModalMode = null | 'url' | 'file'

export default function NewNoteMenu() {
  const createNote = useNoteStore((s) => s.createNote)
  const updateNote = useNoteStore((s) => s.updateNote)
  const setActiveNote = useNoteStore((s) => s.setActiveNote)

  const [menuOpen, setMenuOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const apiReady = hasApiKey()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  useEffect(() => {
    if (modalMode === 'url') inputRef.current?.focus()
  }, [modalMode])

  function closeModal() {
    setModalMode(null)
    setUrl('')
    setError('')
    setLoadingMsg('')
    setDragOver(false)
  }

  function handleNewText() {
    createNote()
    setMenuOpen(false)
  }

  function openUrlMode() {
    setModalMode('url')
    setMenuOpen(false)
  }

  function openFileMode() {
    setModalMode('file')
    setMenuOpen(false)
  }

  async function handleUrlSubmit() {
    if (!url.trim()) return
    let normalizedUrl = url.trim()
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = 'https://' + normalizedUrl
    }
    setLoading(true)
    setError('')

    try {
      if (isYouTubeUrl(normalizedUrl)) {
        if (!hasApiKey()) {
          setError('YouTube 영상 처리에는 Gemini API 키가 필요합니다. Settings에서 설정해주세요.')
          setLoading(false)
          return
        }
        setLoadingMsg('YouTube 영상을 분석하는 중... (영상 길이에 따라 시간이 걸릴 수 있습니다)')
        const result = await processYouTubeUrl(normalizedUrl)
        const noteId = createNote()
        updateNote(noteId, {
          title: result.title,
          content: `> Source: ${normalizedUrl}\n\n${result.content}`,
        })
        setActiveNote(noteId)
        closeModal()
        return
      }

      setLoadingMsg('페이지를 가져오는 중...')
      const result = await fetchUrlAsMarkdown(normalizedUrl)
      const noteId = createNote()
      updateNote(noteId, {
        title: result.title,
        content: `> Source: ${result.url}\n\n${result.content}`,
      })
      setActiveNote(noteId)
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'URL을 가져올 수 없습니다')
    } finally {
      setLoading(false)
      setLoadingMsg('')
    }
  }

  async function handleFileProcess(file: File) {
    const fileType = detectFileType(file)
    if (!fileType) {
      setError(`지원하지 않는 파일 형식입니다: ${file.name}`)
      return
    }

    if (fileType !== 'text' && fileType !== 'markdown' && !hasApiKey()) {
      setError('이 파일 형식은 Gemini API 키가 필요합니다. Settings에서 설정해주세요.')
      return
    }

    setLoading(true)
    setError('')

    const msgs: Record<string, string> = {
      image: '이미지를 분석하는 중...',
      pdf: 'PDF를 변환하는 중...',
      audio: '오디오를 전사하는 중... (파일 크기에 따라 시간이 걸릴 수 있습니다)',
      video: '비디오를 분석하는 중... (파일 크기에 따라 시간이 걸릴 수 있습니다)',
      markdown: '파일을 읽는 중...',
      text: '파일을 읽는 중...',
    }
    setLoadingMsg(msgs[fileType] || '처리 중...')

    try {
      const result = await processFile(file)
      const noteId = createNote()
      const sourceInfo = fileType === 'markdown' || fileType === 'text'
        ? ''
        : `> Imported from: ${file.name}\n\n`
      updateNote(noteId, {
        title: result.title,
        content: sourceInfo + result.content,
      })
      setActiveNote(noteId)
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일을 처리할 수 없습니다')
    } finally {
      setLoading(false)
      setLoadingMsg('')
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileProcess(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileProcess(file)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !loading && modalMode === 'url') handleUrlSubmit()
    if (e.key === 'Escape') closeModal()
  }

  return (
    <div className={styles.container} ref={menuRef}>
      <button className={styles.newBtn} onClick={() => setMenuOpen(!menuOpen)}>
        + New
      </button>

      {menuOpen && (
        <div className={styles.dropdown}>
          <button className={styles.menuItem} onClick={handleNewText}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            텍스트 노트
          </button>
          <button className={styles.menuItem} onClick={openUrlMode}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            URL에서 가져오기
            {!apiReady && <span className={styles.partialBadge}>YouTube 제외</span>}
          </button>

          <div className={styles.divider} />

          {apiReady ? (
            <>
              <button className={styles.menuItem} onClick={openFileMode}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                파일에서 가져오기
              </button>
              <p className={styles.menuHint}>
                이미지, PDF, 음성, 비디오, YouTube, 텍스트
              </p>
              <div className={styles.apiStatus} data-active="true">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                Gemini API 연결됨
              </div>
            </>
          ) : (
            <>
              <button className={`${styles.menuItem} ${styles.menuItemDisabled}`} onClick={openFileMode}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                파일에서 가져오기
                <span className={styles.limitedBadge}>TXT/MD만</span>
              </button>
              <div className={styles.menuDisabledList}>
                <span>이미지</span>
                <span>PDF</span>
                <span>음성</span>
                <span>비디오</span>
                <span>YouTube</span>
              </div>
              <div className={styles.apiSetupBanner}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <div>
                  <p className={styles.apiSetupText}>
                    Gemini API 키를 등록하면<br />모든 포맷을 문서로 변환할 수 있습니다
                  </p>
                  <p className={styles.apiSetupSub}>
                    Settings에서 무료로 설정 가능
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {modalMode === 'url' && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>URL에서 문서 가져오기</h3>
            {apiReady ? (
              <p className={styles.urlHint}>웹페이지, YouTube 링크 모두 지원합니다</p>
            ) : (
              <p className={styles.urlHint}>
                웹페이지를 지원합니다 (YouTube는 Settings에서 Gemini API 키 등록 후 이용 가능)
              </p>
            )}
            <input
              ref={inputRef}
              className={styles.urlInput}
              type="url"
              placeholder={apiReady ? 'https://example.com 또는 YouTube 링크' : 'https://example.com'}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            {error && <p className={styles.error}>{error}</p>}
            {loadingMsg && <p className={styles.loadingMsg}>{loadingMsg}</p>}
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={closeModal} disabled={loading}>
                취소
              </button>
              <button
                className={styles.fetchBtn}
                onClick={handleUrlSubmit}
                disabled={loading || !url.trim()}
              >
                {loading ? '가져오는 중...' : '가져오기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalMode === 'file' && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>파일에서 문서 가져오기</h3>

            {!apiReady && (
              <div className={styles.modalApiBanner}>
                <p>현재 TXT, MD 파일만 가져올 수 있습니다.</p>
                <p>
                  이미지, PDF, 음성, 비디오를 지원하려면{' '}
                  <strong>Settings에서 Gemini API 키</strong>를 등록하세요. (무료)
                </p>
              </div>
            )}

            {!loading && (
              <div
                className={`${styles.dropzone} ${dragOver ? styles.dropzoneActive : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p className={styles.dropzoneText}>
                  파일을 드래그하거나 클릭하여 선택
                </p>
                <p className={styles.dropzoneHint}>
                  {apiReady
                    ? '이미지 (JPG, PNG, WebP) / PDF / 음성 (MP3, WAV) / 비디오 (MP4) / 텍스트 (MD, TXT)'
                    : '텍스트 (MD, TXT, HTML, CSV)'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={apiReady ? ACCEPTED_EXTENSIONS : '.md,.txt,.html,.csv'}
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
              </div>
            )}

            {loading && (
              <div className={styles.processingBox}>
                <div className={styles.spinner} />
                <p className={styles.loadingMsg}>{loadingMsg}</p>
              </div>
            )}

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={closeModal} disabled={loading}>
                {loading ? '처리 중...' : '닫기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
