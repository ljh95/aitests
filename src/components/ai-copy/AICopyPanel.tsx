import { useState, useMemo } from 'react'
import { useNoteStore } from '@/store/noteStore'
import { useUIStore } from '@/store/uiStore'
import { parseChunks, assembleChunks, getWordCount, getCharCount } from '@/lib/markdown'
import { buildFullCopyText, applyTemplate, copyToClipboard, getRelevantTemplates } from '@/lib/aiCopy'
import type { ChunkSelection, PromptTemplate } from '@/types/note'
import ChunkSelector from './ChunkSelector'
import styles from './AICopyPanel.module.css'

type Tab = 'full' | 'chunks' | 'template'

export default function AICopyPanel() {
  const notes = useNoteStore((s) => s.notes)
  const activeNoteId = useNoteStore((s) => s.activeNoteId)
  const setAICopyPanelOpen = useUIStore((s) => s.setAICopyPanelOpen)

  const note = notes.find((n) => n.id === activeNoteId)

  const [tab, setTab] = useState<Tab>('full')
  const [chunks, setChunks] = useState<ChunkSelection[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null)
  const [copied, setCopied] = useState(false)

  const templates = useMemo(
    () => (note ? getRelevantTemplates(note.category) : []),
    [note],
  )

  // Parse chunks when switching to chunks tab
  const initChunks = () => {
    if (note && chunks.length === 0) {
      setChunks(parseChunks(note.content))
    }
  }

  const handleTabChange = (t: Tab) => {
    setTab(t)
    if (t === 'chunks') initChunks()
  }

  const toggleChunk = (index: number) => {
    setChunks((prev) =>
      prev.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c)),
    )
  }

  const selectAllChunks = (selected: boolean) => {
    setChunks((prev) => prev.map((c) => ({ ...c, selected })))
  }

  const getCopyText = (): string => {
    if (!note) return ''
    switch (tab) {
      case 'full':
        return buildFullCopyText(note)
      case 'chunks':
        return assembleChunks(chunks)
      case 'template': {
        const content =
          chunks.length > 0 ? assembleChunks(chunks) : note.content
        return selectedTemplate
          ? applyTemplate(selectedTemplate, note, content)
          : note.content
      }
      default:
        return note.content
    }
  }

  const handleCopy = async () => {
    const text = getCopyText()
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  const copyText = getCopyText()

  if (!note) return null

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.tabs}>
          {(['full', 'chunks', 'template'] as Tab[]).map((t) => (
            <button
              key={t}
              className={`${styles.tab} ${tab === t ? styles.activeTab : ''}`}
              onClick={() => handleTabChange(t)}
            >
              {t === 'full' ? 'Full' : t === 'chunks' ? 'Chunks' : 'Template'}
            </button>
          ))}
        </div>
        <button className={styles.closeBtn} onClick={() => setAICopyPanelOpen(false)}>
          &times;
        </button>
      </div>

      <div className={styles.body}>
        {tab === 'chunks' && (
          <div className={styles.chunkSection}>
            <ChunkSelector
              chunks={chunks}
              onToggle={toggleChunk}
              onSelectAll={selectAllChunks}
            />
          </div>
        )}

        {tab === 'template' && (
          <div className={styles.templateSection}>
            <div className={styles.templateList}>
              {templates.map((t) => (
                <button
                  key={t.id}
                  className={`${styles.templateItem} ${
                    selectedTemplate?.id === t.id ? styles.activeTemplate : ''
                  }`}
                  onClick={() => setSelectedTemplate(t)}
                >
                  <span className={styles.templateName}>{t.name}</span>
                  <span className={styles.templateDesc}>{t.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.previewSection}>
          <textarea
            className={styles.previewText}
            value={copyText}
            readOnly
          />
          <div className={styles.stats}>
            <span>{getCharCount(copyText)} chars</span>
            <span>{getWordCount(copyText)} words</span>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <button
          className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
          onClick={handleCopy}
        >
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
      </div>
    </div>
  )
}
