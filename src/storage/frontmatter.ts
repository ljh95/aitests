import type { Note, Category } from '@/types/note'

const CATEGORY_VALUES: Category[] = ['study', 'code', 'life', 'idea']

/** Serialize a Note object into a markdown string with YAML frontmatter */
export function serializeNote(note: Note): string {
  const lines = [
    '---',
    `id: "${note.id}"`,
    `title: "${escapeYamlString(note.title)}"`,
    `category: ${note.category}`,
    `tags: [${note.tags.map((t) => `"${escapeYamlString(t)}"`).join(', ')}]`,
    `created: ${note.createdAt}`,
    `updated: ${note.updatedAt}`,
    `pinned: ${note.isPinned}`,
    '---',
    '',
  ]
  return lines.join('\n') + note.content
}

/** Parse a markdown file with YAML frontmatter into a Note object */
export function parseNoteFile(raw: string, fallbackId?: string): Note {
  const { meta, content } = extractFrontmatter(raw)

  const id = unquote(meta.id) || fallbackId || crypto.randomUUID()
  const title = unquote(meta.title) || ''
  const category = parseCategory(meta.category)
  const tags = parseTags(meta.tags)
  const createdAt = meta.created || new Date().toISOString()
  const updatedAt = meta.updated || new Date().toISOString()
  const isPinned = meta.pinned === 'true'

  return { id, title, content, category, tags, createdAt, updatedAt, isPinned }
}

/** Generate a translation sidecar filename (.ko.md) from a note */
export function noteToTranslationFilename(note: Note): string {
  return noteToFilename(note).replace(/\.md$/, '.ko.md')
}

/** Generate a filesystem-safe filename from a note */
export function noteToFilename(note: Note): string {
  if (!note.title || note.title.trim() === '') {
    return `untitled-${note.id.slice(0, 8)}.md`
  }
  const slug = note.title
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // remove filesystem-unsafe chars
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
  return slug ? `${slug}.md` : `untitled-${note.id.slice(0, 8)}.md`
}

// --- Internal helpers ---

function extractFrontmatter(raw: string): { meta: Record<string, string>; content: string } {
  const meta: Record<string, string> = {}
  if (!raw.startsWith('---')) {
    return { meta, content: raw }
  }

  const endIndex = raw.indexOf('\n---', 3)
  if (endIndex === -1) {
    return { meta, content: raw }
  }

  const frontmatterBlock = raw.slice(4, endIndex)
  const content = raw.slice(endIndex + 4).replace(/^\n/, '')

  for (const line of frontmatterBlock.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()
    if (key) meta[key] = value
  }

  return { meta, content }
}

function unquote(s: string | undefined): string {
  if (!s) return ''
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1)
  }
  return s
}

function escapeYamlString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function parseCategory(s: string | undefined): Category {
  if (!s) return 'study'
  const cleaned = s.trim().toLowerCase()
  return CATEGORY_VALUES.includes(cleaned as Category) ? (cleaned as Category) : 'study'
}

function parseTags(s: string | undefined): string[] {
  if (!s) return []
  // Parse format: ["tag1", "tag2"] or [tag1, tag2]
  const match = s.match(/\[(.*)]/s)
  if (!match || !match[1]) return []
  const inner = match[1].trim()
  if (!inner) return []
  return inner.split(',').map((t) => unquote(t.trim())).filter(Boolean)
}
