import type { PromptTemplate } from '@/types/note'

export const defaultTemplates: PromptTemplate[] = [
  {
    id: 'explain-study',
    name: 'Explain This',
    category: 'study',
    template:
      'I have the following study note. Please explain the key concepts in simple terms and point out anything I might be misunderstanding:\n\n## My Note: {{title}}\n{{content}}',
    description: 'Get explanations for study material',
  },
  {
    id: 'review-code',
    name: 'Review Code',
    category: 'code',
    template:
      'Please review the following code from my notes. Suggest improvements, potential bugs, and best practices:\n\n{{content}}',
    description: 'Code review from your notes',
  },
  {
    id: 'quiz-me',
    name: 'Quiz Me',
    category: 'study',
    template:
      'Based on the following study notes, create 5 quiz questions to test my understanding. Include answers at the end:\n\n## Topic: {{title}}\n{{content}}',
    description: 'Generate quiz questions from notes',
  },
  {
    id: 'summarize',
    name: 'Summarize',
    category: 'general',
    template:
      'Please provide a concise summary of the following note, highlighting the key points:\n\n{{content}}',
    description: 'Get a quick summary',
  },
  {
    id: 'expand-idea',
    name: 'Expand Idea',
    category: 'idea',
    template:
      'I have the following rough idea. Please help me think through it more deeply, identify potential challenges, and suggest next steps:\n\n## Idea: {{title}}\n{{content}}',
    description: 'Develop an idea further',
  },
  {
    id: 'debug-help',
    name: 'Debug This',
    category: 'code',
    template:
      'I\'m having an issue described in my notes below. Please help me debug it and suggest solutions:\n\n{{content}}',
    description: 'Get debugging help',
  },
  {
    id: 'life-advice',
    name: 'Think Through',
    category: 'life',
    template:
      'I\'ve written down some thoughts about a situation I\'m dealing with. Please help me think through this objectively and consider different perspectives:\n\n{{content}}',
    description: 'Get perspective on life situations',
  },
]
