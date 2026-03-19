import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import CodeBlock from './CodeBlock'
import { useNoteStore } from '@/store/noteStore'
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

export default function MarkdownPreview() {
  const notes = useNoteStore((s) => s.notes)
  const activeNoteId = useNoteStore((s) => s.activeNoteId)

  const note = notes.find((n) => n.id === activeNoteId)

  if (!note) {
    return (
      <div style={{ padding: 40, color: 'var(--text-secondary)', textAlign: 'center' }}>
        Select a note to preview
      </div>
    )
  }

  return (
    <div className={styles.preview}>
      {note.title && <h1 className={styles.title}>{note.title}</h1>}
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {note.content}
      </ReactMarkdown>
    </div>
  )
}
