import { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import CodeBlock from './CodeBlock'
import { useNoteStore } from '@/store/noteStore'
import { useUIStore, type PreviewLang } from '@/store/uiStore'
import { translateContent, buildBilingualContent } from '@/lib/translate'
import styles from './MarkdownPreview.module.css'

const components: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '')
    const isBlock = !props.node || props.node.position?.start.column === 1
    if (match && isBlock) {
      return (
        <CodeBlock language={match[1]!}>
          {String(children).replace(/\n$/, '')}
        </CodeBlock>
      )
    }
    return <code className={styles.inlineCode} {...props}>{children}</code>
  },
  h1: ({ children }) => <h1 className={styles.h1}>{children}</h1>,
  h2: ({ children }) => <h2 className={styles.h2}>{children}</h2>,
  h3: ({ children }) => <h3 className={styles.h3}>{children}</h3>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
  ),
  table: ({ children }) => (
    <div className={styles.tableWrap}>
      <table className={styles.table}>{children}</table>
    </div>
  ),
}

const langLabels: Record<PreviewLang, string> = {
  original: '원문',
  korean: '한글',
  bilingual: '원문+한글',
}

const langOrder: PreviewLang[] = ['original', 'korean', 'bilingual']

export default function MarkdownPreview() {
  const notes = useNoteStore((s) => s.notes)
  const activeNoteId = useNoteStore((s) => s.activeNoteId)
  const updateNote = useNoteStore((s) => s.updateNote)
  const previewLang = useUIStore((s) => s.previewLang)
  const setPreviewLang = useUIStore((s) => s.setPreviewLang)

  const [translating, setTranslating] = useState(false)
  const [progress, setProgress] = useState(0)

  const note = notes.find((n) => n.id === activeNoteId)

  const handleTranslate = useCallback(async () => {
    if (!note || translating) return
    setTranslating(true)
    setProgress(0)
    try {
      const translated = await translateContent(note.content, setProgress)
      updateNote(note.id, { translatedContent: translated })
    } catch (e) {
      console.error('Translation failed:', e)
    } finally {
      setTranslating(false)
    }
  }, [note, translating, updateNote])

  if (!note) {
    return (
      <div style={{ padding: 40, color: 'var(--text-secondary)', textAlign: 'center' }}>
        Select a note to preview
      </div>
    )
  }

  const hasTranslation = !!note.translatedContent
  const needsTranslation = previewLang !== 'original' && !hasTranslation

  let displayContent = note.content
  if (previewLang === 'korean' && hasTranslation) {
    displayContent = note.translatedContent!
  } else if (previewLang === 'bilingual' && hasTranslation) {
    displayContent = buildBilingualContent(note.content, note.translatedContent!)
  }

  return (
    <div className={styles.preview}>
      <div className={styles.toolbar}>
        <div className={styles.langToggle}>
          {langOrder.map((lang) => (
            <button
              key={lang}
              className={`${styles.langBtn} ${previewLang === lang ? styles.langBtnActive : ''}`}
              onClick={() => setPreviewLang(lang)}
            >
              {langLabels[lang]}
            </button>
          ))}
        </div>
        {needsTranslation && (
          <button
            className={styles.translateBtn}
            onClick={handleTranslate}
            disabled={translating}
          >
            {translating ? `번역 중... ${Math.round(progress * 100)}%` : '번역하기'}
          </button>
        )}
        {hasTranslation && previewLang !== 'original' && (
          <button
            className={styles.retranslateBtn}
            onClick={handleTranslate}
            disabled={translating}
          >
            {translating ? `번역 중... ${Math.round(progress * 100)}%` : '재번역'}
          </button>
        )}
      </div>

      {note.title && <h1 className={styles.title}>{note.title}</h1>}
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {displayContent}
      </ReactMarkdown>
    </div>
  )
}
