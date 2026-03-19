import type { ChunkSelection } from '@/types/note'

export function parseChunks(markdown: string): ChunkSelection[] {
  const chunks: ChunkSelection[] = []
  const lines = markdown.split('\n')
  let currentChunk: ChunkSelection | null = null

  for (const line of lines) {
    const match = /^(#{1,6})\s+(.+)$/.exec(line)
    if (match) {
      if (currentChunk) {
        chunks.push(currentChunk)
      }
      currentChunk = {
        headingText: match[2]!,
        level: match[1]!.length,
        content: line + '\n',
        selected: true,
      }
    } else if (currentChunk) {
      currentChunk.content += line + '\n'
    } else {
      // Content before first heading
      if (line.trim()) {
        currentChunk = {
          headingText: 'Preamble',
          level: 0,
          content: line + '\n',
          selected: true,
        }
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk)
  }

  return chunks
}

export function assembleChunks(chunks: ChunkSelection[]): string {
  return chunks
    .filter((c) => c.selected)
    .map((c) => c.content.trimEnd())
    .join('\n\n')
}

export function getWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function getCharCount(text: string): number {
  return text.length
}
