import type { Note } from '@/types/note'

export function seedNotes(): Note[] {
  const now = new Date().toISOString()
  return [
    {
      id: crypto.randomUUID(),
      title: 'KAB에 오신 것을 환영합니다',
      content: `# KAB - Knowledge AI Bridge

나만의 지식을 저장하고, AI에게 효과적으로 전달하는 도구입니다.

## 핵심 기능

- **마크다운 편집**: 코드 블록, 테이블, 체크리스트 지원
- **AI Copy**: 노트를 AI 도구에 맞게 복사
  - 전체 복사 / 청크 선택 / 프롬프트 템플릿
- **카테고리**: study, code, life, idea

## 단축키

| 단축키 | 기능 |
|---|---|
| \`Cmd+N\` | 새 노트 |
| \`Cmd+E\` | 편집/프리뷰 토글 |
| \`Cmd+Shift+C\` | AI Copy 패널 |
| \`Cmd+K\` | 검색 포커스 |
`,
      category: 'study',
      tags: ['welcome'],
      createdAt: now,
      updatedAt: now,
      isPinned: true,
    },
    {
      id: crypto.randomUUID(),
      title: 'TypeScript 유틸리티 타입 정리',
      content: `# TypeScript 유틸리티 타입

## Partial<T>
모든 프로퍼티를 optional로 만듭니다.

\`\`\`typescript
interface User {
  name: string;
  age: number;
}

type PartialUser = Partial<User>;
// { name?: string; age?: number; }
\`\`\`

## Pick<T, K>
특정 프로퍼티만 선택합니다.

\`\`\`typescript
type UserName = Pick<User, 'name'>;
// { name: string; }
\`\`\`

## Omit<T, K>
특정 프로퍼티를 제외합니다.

\`\`\`typescript
type UserWithoutAge = Omit<User, 'age'>;
// { name: string; }
\`\`\`
`,
      category: 'code',
      tags: ['typescript', 'utility-types'],
      createdAt: now,
      updatedAt: now,
      isPinned: false,
    },
    {
      id: crypto.randomUUID(),
      title: '사이드 프로젝트 아이디어',
      content: `# 사이드 프로젝트 아이디어 모음

## 지식-AI 브릿지 앱
- 마크다운 노트를 AI에 최적화해서 전달
- 프롬프트 템플릿으로 한 번에 복사
- 웹 + 모바일 크로스 플랫폼

## 개발 블로그 자동화
- GitHub 커밋에서 자동으로 TIL 생성
- 주간 요약 리포트

## CLI 생산성 도구
- 자주 쓰는 명령어 스니펫 관리
- fuzzy search로 빠르게 찾기
`,
      category: 'idea',
      tags: ['project', 'brainstorm'],
      createdAt: now,
      updatedAt: now,
      isPinned: false,
    },
  ]
}
