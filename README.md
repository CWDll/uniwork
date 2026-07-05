# Uniwork

외국인 유학생을 위한 아르바이트 구인구직 웹앱입니다. 초기 타겟은 `D-2`, `D-4` 유학생이며, 기업 공고 등록, 구직자 지원, 커뮤니티, 행정 상담 요청과 운영자 검토 후 행정사 배정 흐름을 포함합니다.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-compatible component structure
- Supabase 예정: Auth, Postgres, Storage, RLS

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docs

- [Initial product design](docs/initial-design.md)

## Product Notes

- 모바일은 코워크처럼 앱형 검색/필터/공고 리스트를 우선합니다.
- 데스크톱은 잡보드형 레이아웃으로 확장합니다.
- 기업 공고 등록은 1차 MVP에서 무료입니다.
- 결제가 필요한 기능은 실제 과금 전 테스트 결제 수준으로만 붙입니다.
- 외국인등록번호, 여권번호 같은 고유식별정보는 1차 MVP에서 직접 수집하지 않는 방향을 기본값으로 둡니다.
