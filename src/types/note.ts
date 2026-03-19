export type Category = 'study' | 'code' | 'life' | 'idea'

export interface Note {
  id: string
  title: string
  content: string
  category: Category
  tags: string[]
  createdAt: string
  updatedAt: string
  isPinned: boolean
}

export interface PromptTemplate {
  id: string
  name: string
  category: string
  template: string
  description: string
}

export interface ChunkSelection {
  headingText: string
  level: number
  content: string
  selected: boolean
}
