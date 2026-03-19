import { useCallback, useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import { useNoteStore } from '@/store/noteStore'

const lineWrapping = EditorView.lineWrapping

export default function MarkdownEditor() {
  const notes = useNoteStore((s) => s.notes)
  const activeNoteId = useNoteStore((s) => s.activeNoteId)
  const updateNote = useNoteStore((s) => s.updateNote)

  const note = notes.find((n) => n.id === activeNoteId)

  const extensions = useMemo(() => [markdown(), lineWrapping], [])

  const onChange = useCallback(
    (value: string) => {
      if (activeNoteId) {
        updateNote(activeNoteId, { content: value })
      }
    },
    [activeNoteId, updateNote],
  )

  if (!note) {
    return (
      <div style={{ padding: 40, color: 'var(--text-secondary)', textAlign: 'center' }}>
        Select a note or create a new one
      </div>
    )
  }

  return (
    <CodeMirror
      key={note.id}
      value={note.content}
      theme={oneDark}
      extensions={extensions}
      onChange={onChange}
      style={{ height: '100%', fontSize: '14px' }}
      basicSetup={{
        lineNumbers: false,
        foldGutter: false,
        highlightActiveLine: true,
        tabSize: 2,
      }}
    />
  )
}
