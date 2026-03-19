import { useState, useCallback } from 'react'
import { useNoteStore } from '@/store/noteStore'
import { storageManager } from '@/storage/storageManager'
import styles from './FolderTree.module.css'

interface FolderNode {
  name: string
  path: string
  children: FolderNode[]
}

function buildTree(folders: string[]): FolderNode[] {
  const root: FolderNode[] = []
  for (const folder of folders) {
    const parts = folder.split('/')
    let current = root
    let pathSoFar = ''
    for (const part of parts) {
      pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part
      let node = current.find((n) => n.name === part)
      if (!node) {
        node = { name: part, path: pathSoFar, children: [] }
        current.push(node)
      }
      current = node.children
    }
  }
  return root
}

function FolderItem({
  node,
  currentFolder,
  onSelect,
}: {
  node: FolderNode
  currentFolder: string
  onSelect: (path: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const isActive = currentFolder === node.path
  const hasChildren = node.children.length > 0

  return (
    <div>
      <div
        className={`${styles.item} ${isActive ? styles.active : ''}`}
        onClick={() => onSelect(node.path)}
      >
        {hasChildren && (
          <button
            className={styles.toggle}
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
          >
            {expanded ? '\u25BE' : '\u25B8'}
          </button>
        )}
        {!hasChildren && <span className={styles.toggleSpace} />}
        <span className={styles.icon}>&#128193;</span>
        <span className={styles.name}>{node.name}</span>
      </div>
      {hasChildren && expanded && (
        <div className={styles.children}>
          {node.children.map((child) => (
            <FolderItem
              key={child.path}
              node={child}
              currentFolder={currentFolder}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FolderTree() {
  const folders = useNoteStore((s) => s.folders)
  const currentFolder = useNoteStore((s) => s.currentFolder)
  const setCurrentFolder = useNoteStore((s) => s.setCurrentFolder)
  const refreshFolders = useNoteStore((s) => s.refreshFolders)
  const [showInput, setShowInput] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const tree = buildTree(folders)
  const isRoot = currentFolder === ''

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return
    const path = currentFolder
      ? `${currentFolder}/${newFolderName.trim()}`
      : newFolderName.trim()

    const backend = await storageManager.getBackend()
    await backend.createFolder(path)
    await refreshFolders()
    setNewFolderName('')
    setShowInput(false)
  }, [newFolderName, currentFolder, refreshFolders])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Folders</span>
        <button
          className={styles.addBtn}
          onClick={() => setShowInput(!showInput)}
          title="New folder"
        >
          +
        </button>
      </div>

      {showInput && (
        <div className={styles.inputRow}>
          <input
            className={styles.input}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder()
              if (e.key === 'Escape') setShowInput(false)
            }}
            placeholder="Folder name"
            autoFocus
          />
        </div>
      )}

      <div
        className={`${styles.item} ${isRoot ? styles.active : ''}`}
        onClick={() => setCurrentFolder('')}
      >
        <span className={styles.icon}>&#127968;</span>
        <span className={styles.name}>All Notes</span>
      </div>

      {tree.map((node) => (
        <FolderItem
          key={node.path}
          node={node}
          currentFolder={currentFolder}
          onSelect={setCurrentFolder}
        />
      ))}
    </div>
  )
}
