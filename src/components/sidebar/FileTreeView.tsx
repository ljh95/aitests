import { useState, useMemo } from 'react'
import { useNoteStore } from '@/store/noteStore'
import { useUIStore } from '@/store/uiStore'
import { useFilteredNotes } from '@/hooks/useSearch'
import type { Note, Category } from '@/types/note'
import styles from './FileTreeView.module.css'

const categoryMeta: Record<Category, { label: string; color: string }> = {
  study: { label: 'Study', color: '#569cd6' },
  code: { label: 'Code', color: '#4ec9b0' },
  life: { label: 'Life', color: '#dcdcaa' },
  idea: { label: 'Idea', color: '#c586c0' },
}

interface TreeNode {
  name: string
  path: string
  color?: string
  notes: Note[]
  children: TreeNode[]
}

function buildCategoryTree(notes: Note[]): TreeNode[] {
  const grouped: Record<Category, Note[]> = { study: [], code: [], life: [], idea: [] }
  for (const note of notes) {
    grouped[note.category].push(note)
  }
  return (Object.keys(grouped) as Category[])
    .filter((cat) => grouped[cat].length > 0)
    .map((cat) => ({
      name: categoryMeta[cat].label,
      path: `@category/${cat}`,
      color: categoryMeta[cat].color,
      notes: grouped[cat],
      children: [],
    }))
}

function buildFolderTree(notes: Note[], folders: string[]): TreeNode[] {
  const rootNotes = notes.filter((n) => !n.folderPath)
  const tree: TreeNode[] = []
  const nodeMap = new Map<string, TreeNode>()

  for (const folder of folders) {
    const parts = folder.split('/')
    let pathSoFar = ''
    for (const part of parts) {
      pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part
      if (!nodeMap.has(pathSoFar)) {
        const node: TreeNode = { name: part, path: pathSoFar, notes: [], children: [] }
        nodeMap.set(pathSoFar, node)
        const parentPath = pathSoFar.includes('/') ? pathSoFar.slice(0, pathSoFar.lastIndexOf('/')) : ''
        if (parentPath && nodeMap.has(parentPath)) {
          nodeMap.get(parentPath)!.children.push(node)
        } else if (!parentPath) {
          tree.push(node)
        }
      }
    }
  }

  for (const note of notes) {
    if (note.folderPath && nodeMap.has(note.folderPath)) {
      nodeMap.get(note.folderPath)!.notes.push(note)
    }
  }

  if (rootNotes.length > 0) {
    tree.unshift({ name: 'Root', path: '', notes: rootNotes, children: [] })
  }

  return tree
}

function NoteItem({
  note,
  isActive,
  onClick,
  onDelete,
  depth,
}: {
  note: Note
  isActive: boolean
  onClick: () => void
  onDelete: () => void
  depth: number
}) {
  return (
    <div
      className={`${styles.noteItem} ${isActive ? styles.active : ''}`}
      style={{ paddingLeft: depth * 16 + 12 }}
      onClick={onClick}
    >
      <span className={styles.noteIcon}>&#128196;</span>
      <span className={styles.noteTitle}>
        {note.isPinned && <span className={styles.pin}>*</span>}
        {note.title || 'Untitled'}
      </span>
      <button
        className={styles.deleteBtn}
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        title="Delete"
      >
        &times;
      </button>
    </div>
  )
}

function FolderNode({
  node,
  activeNoteId,
  onSelectNote,
  onDeleteNote,
  depth,
  defaultExpanded,
}: {
  node: TreeNode
  activeNoteId: string | null
  onSelectNote: (id: string) => void
  onDeleteNote: (id: string) => void
  depth: number
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? true)
  const hasContent = node.children.length > 0 || node.notes.length > 0
  const count = node.notes.length + node.children.reduce((sum, c) => sum + countNotes(c), 0)

  return (
    <div>
      <div
        className={styles.folderItem}
        style={{ paddingLeft: depth * 16 + 4 }}
        onClick={() => setExpanded(!expanded)}
      >
        <span className={styles.toggle}>{hasContent ? (expanded ? '\u25BE' : '\u25B8') : ''}</span>
        <span className={styles.folderIcon} style={node.color ? { color: node.color } : undefined}>
          {expanded ? '\uD83D\uDCC2' : '\uD83D\uDCC1'}
        </span>
        <span className={styles.folderName}>{node.name}</span>
        <span className={styles.count}>{count}</span>
      </div>
      {expanded && (
        <div>
          {node.children.map((child) => (
            <FolderNode
              key={child.path}
              node={child}
              activeNoteId={activeNoteId}
              onSelectNote={onSelectNote}
              onDeleteNote={onDeleteNote}
              depth={depth + 1}
            />
          ))}
          {node.notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              isActive={note.id === activeNoteId}
              onClick={() => onSelectNote(note.id)}
              onDelete={() => onDeleteNote(note.id)}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function countNotes(node: TreeNode): number {
  return node.notes.length + node.children.reduce((sum, c) => sum + countNotes(c), 0)
}

export default function FileTreeView() {
  const sidebarView = useUIStore((s) => s.sidebarView)
  const activeNoteId = useNoteStore((s) => s.activeNoteId)
  const setActiveNote = useNoteStore((s) => s.setActiveNote)
  const deleteNote = useNoteStore((s) => s.deleteNote)
  const folders = useNoteStore((s) => s.folders)
  const filteredNotes = useFilteredNotes()

  const tree = useMemo(() => {
    if (sidebarView === 'category') {
      return buildCategoryTree(filteredNotes)
    }
    return buildFolderTree(filteredNotes, folders)
  }, [sidebarView, filteredNotes, folders])

  return (
    <div className={styles.container}>
      {tree.length === 0 ? (
        <div className={styles.empty}>노트가 없습니다</div>
      ) : (
        tree.map((node) => (
          <FolderNode
            key={node.path}
            node={node}
            activeNoteId={activeNoteId}
            onSelectNote={setActiveNote}
            onDeleteNote={deleteNote}
            depth={0}
            defaultExpanded
          />
        ))
      )}
    </div>
  )
}
