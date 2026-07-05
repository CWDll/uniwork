# Uniwork Initial Product Design

작성일: 2026-07-05
업데이트: 2026-07-05

## 1. 제품 방향

`Uniwork`라는 이름으로 외국인 대상 아르바이트/채용 구인구직 웹앱을 만든다. 벤치마크는 코워크이며, 모바일은 코워크처럼 앱형 리스트 중심 UI를 따른다. 데스크톱은 첨부 이미지처럼 잡보드 대시보드형 화면으로 재구성한다.

초기 타겟은 유학생 `D-2`, `D-4` 중심으로 잡는다. F계열은 정책상 가능한 범위만 제한적으로 열어두되, `F-1`, `F-3`, `F-4`는 구직/지원 가능 대상으로 보지 않고 차단한다. `F-2`는 세부 조건 확인이 필요하므로 1차 MVP에서는 `검토 필요` 상태로 둔다.

핵심 차별점은 구직자의 비자/체류/학교/근무 가능 조건을 구조화해서 받고, 필요 시 운영자가 검토한 뒤 행정사에게 온라인으로 전달할 수 있는 운영 흐름을 제품 안에 포함하는 것이다.

## 2. 사용자와 역할

- 구직자: 외국인 유학생/외국인 인재. 공고 탐색, 저장, 지원, 프로필/이력서 작성, 커뮤니티 이용, 행정 상담 신청.
- 기업: 채용 기업. 기업 가입, 공고 등록/관리, 지원자 확인, 지원자 상태 관리, 행정 지원 요청.
- 행정사/파트너: 운영자에게 배정받은 구직자 서류와 상담 요청을 확인하고 처리 상태를 업데이트.
- 운영자: 회원/기업/공고/지원/커뮤니티/신고/행정 요청/결제 또는 유료상품 상태 관리.

## 3. 1차 MVP 범위

### 구직자

- 이메일/소셜 로그인
- 개인 프로필 작성
- 국적, 비자, 외국인등록 여부, 학교, 전공, 한국어 수준, 가능 근무 시간, 희망 지역/직무 입력
- 이력서/자기소개 작성
- 공고 목록/상세/검색/필터
- 공고 저장, 지원
- 지원 내역 확인
- 행정 상담 신청
- 커뮤니티 글/댓글/신고

### 기업

- 기업 회원가입/로그인
- 기업 정보 작성
- 채용공고 작성
- 공고 임시저장/승인대기/게시/마감
- 지원자 목록 확인
- 지원자 상세 프로필 확인
- 지원 상태 변경
- 행정 지원 요청

### 운영자

- 공고 승인/반려
- 회원/기업 조회
- 지원 내역 조회
- 커뮤니티 신고 처리
- 행정 상담 요청 배정/상태 관리
- 데이터 CSV 다운로드

### 행정사 전달

- 구직자가 행정 상담 또는 서류 검토 요청 생성
- 구직자 동의 기반으로 필요한 프로필/서류만 전달
- 운영자가 1차 검토 후 행정사에게 수동 배정
- 행정사가 상태 업데이트: 접수, 서류보완요청, 검토중, 완료, 반려
- 모든 전달/열람/상태 변경 이력 기록

### 결제

- 기업 공고 등록은 1차 MVP에서 무료로 둔다.
- 유료 상품은 기본 범위에 넣지 않는다.
- 결제가 필요한 실험 기능이 생기면 실제 과금 전 `테스트 결제` 수준으로만 붙인다.

## 4. 화면 정보 구조

### Public

- `/`: 구직자 홈. 모바일은 코워크형 탭/검색/필터/공고 리스트. 데스크톱은 상단 네비게이션, 히어로 검색, 카테고리, 추천 공고, 우측 로그인/팁 패널.
- `/jobs`: 공고 목록
- `/jobs/[id]`: 공고 상세 및 지원
- `/corp`: 기업 랜딩
- `/community`: 커뮤니티 목록
- `/community/[id]`: 커뮤니티 상세
- `/visa-guide`: 비자/행정 정보
- `/login`, `/signup`

### Seeker App

- `/me`: 구직자 대시보드
- `/me/profile`: 프로필
- `/me/resume`: 이력서
- `/me/applications`: 지원 내역
- `/me/saved`: 저장한 공고
- `/me/admin-requests`: 행정 상담/서류 전달 내역

### Company App

- `/company`: 기업 대시보드
- `/company/jobs`: 공고 관리
- `/company/jobs/new`: 공고 작성
- `/company/jobs/[id]/applications`: 지원자 확인
- `/company/profile`: 기업 정보

### Admin

- `/admin`: 운영자 대시보드
- `/admin/jobs`
- `/admin/users`
- `/admin/companies`
- `/admin/applications`
- `/admin/community`
- `/admin/admin-requests`
- `/admin/reports`

## 5. 데이터 모델 초안

- `users`: id, role, email, name, phone, locale, createdAt
- `seeker_profiles`: userId, nationality, visaType, alienRegistrationStatus, school, major, koreanLevel, englishLevel, preferredLocations, preferredJobTypes, availableTimes
- `visa_eligibility_rules`: visaType, canBrowse, canApply, needsReview, blockedReason
- `resumes`: id, seekerId, title, intro, education, experience, languages, files, visibility
- `companies`: id, ownerId, name, businessNumber, industry, address, managerName, managerPhone, verificationStatus
- `jobs`: id, companyId, title, description, employmentType, category, location, wageType, wageAmount, visaSupportType, koreanRequirement, status, publishedAt, closedAt
- `job_applications`: id, jobId, seekerId, resumeId, status, message, appliedAt
- `saved_jobs`: seekerId, jobId
- `community_posts`: id, authorId, category, title, body, status
- `community_comments`: id, postId, authorId, body, status
- `reports`: id, reporterId, targetType, targetId, reason, status
- `admin_requests`: id, seekerId, type, consentId, assignedPartnerId, status, memo
- `admin_request_files`: id, requestId, fileUrl, fileType, uploadedBy
- `consents`: id, userId, purpose, dataScope, recipientType, recipientId, status, agreedAt, revokedAt
- `audit_logs`: actorId, action, targetType, targetId, metadata, createdAt

## 6. 기술 스택 추천

### 추천안 A: Next.js + Supabase + Vercel

1인 개발/운영 기준의 우선 추천안.

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase Auth, Postgres, Storage, Row Level Security
- Prisma 또는 Drizzle ORM
- Vercel 배포
- Resend 또는 Supabase Edge Functions 기반 이메일
- Toss Payments는 실제 결제 필요 시 후순위 도입

장점: 관계형 데이터가 필요한 채용/지원/권한/관리자 기능에 잘 맞고, SQL로 운영 조회가 쉽다. 구직자 1,000명대/기업 20개 내외 규모에서는 비용과 복잡도가 적절하다.

### 대안 B: Next.js + Firebase

- Firebase Auth, Firestore, Storage, Cloud Functions
- 빠른 프로토타입에는 좋다.
- 다만 지원자/공고/기업/운영자 조건 검색과 관리자 통계가 늘어나면 NoSQL 모델링과 보안 규칙 관리가 번거로울 수 있다.

결론: 이 서비스는 “채용공고-지원-기업-구직자-행정요청” 관계가 중요하므로 Supabase/Postgres 쪽을 우선 추천한다.

## 7. PWA와 앱스토어 전략

- 1차는 모바일 웹/PWA 대응: manifest, service worker, install prompt, push 알림 구조 준비.
- Play Store/App Store 배포가 필요해지면 Capacitor로 Next.js 웹앱을 감싸는 방식이 현실적이다.
- 앱스토어 심사까지 고려하면 처음부터 모바일 웹 UI를 네이티브 앱처럼 설계하고, 로그인/파일 업로드/푸시 알림 권한 흐름을 정리해두는 것이 좋다.

## 8. UI 설계 방향

- 모바일: 코워크처럼 탭, 배너, 검색, 필터, 공고 카드, 하단 탭 네비게이션.
- 데스크톱: 첨부 이미지처럼 잡보드형 레이아웃.
- 디자인 시스템: Tailwind + shadcn/ui를 기본으로 하되, 버튼/탭/카드/폼/상태 배지/데이터 테이블 컴포넌트를 서비스 전용으로 정리.
- 톤: 파란색을 메인으로 쓰되, 전체가 단색 앱처럼 보이지 않도록 그린/옐로/레드 상태 색과 충분한 중립색을 사용.
- 운영자/기업 화면은 마케팅 랜딩이 아니라 조밀한 SaaS 대시보드처럼 설계.

## 9. 개발 단계

### Phase 0. 설계 확정

- 기능 범위 확정
- 법적/개인정보 처리 범위 확인
- 도메인명/서비스명 확정
- Supabase 프로젝트/DB 스키마 설계

### Phase 1. Foundation

- Next.js 프로젝트 생성
- GitHub repository 생성 및 remote 연결
- Tailwind/shadcn/ui 세팅
- Supabase Auth 연결
- 역할 기반 라우팅
- 기본 레이아웃, 모바일/데스크톱 홈

### Phase 2. Job Flow

- 기업 가입/기업 프로필
- 공고 작성/관리
- 공고 승인/게시
- 구직자 공고 탐색/상세/지원

### Phase 3. Profile & Admin Request

- 구직자 프로필/이력서
- 행정 상담 요청
- 동의 관리
- 행정사 전달/상태 관리

### Phase 4. Community & Admin

- 커뮤니티
- 신고
- 운영자 대시보드
- CSV export

### Phase 5. PWA & Production

- PWA 설정
- 알림/이메일
- 약관/개인정보처리방침
- 보안 점검
- 배포/모니터링

## 10. 법적/운영 리스크

- 구인구직 사이트 운영은 직업정보제공사업 신고 또는 직업소개사업 등록 이슈가 생길 수 있다.
- D-2/D-4 유학생의 시간제 취업은 근무 가능 시간, 학교 확인, 체류자격별 제한이 있어 공고 지원 전 안내/체크가 필요하다.
- F계열은 체류자격별 취업 가능 범위가 다르므로 1차에서는 보수적으로 차단/검토 상태를 둔다.
- 구직자에게 유료 매칭/취업 성공 수수료를 받는 구조는 특히 법률 검토가 필요하다.
- 외국인등록번호, 여권번호 등은 고유식별정보에 해당하므로 수집하지 않는 방향이 우선이다.
- 행정사에게 개인정보를 전달하려면 제3자 제공 동의, 제공 항목, 목적, 보유기간, 철회 절차가 필요하다.
- 파일 업로드는 접근권한, 만료 URL, 열람 로그가 필요하다.

## 11. 지금 확인할 질문

1. 커뮤니티는 익명 허용인가, 실명/닉네임 기반인가?
2. 관리자는 몇 명이고, 행정사 계정도 별도 로그인이 필요한가?
3. 초기 배포 도메인은 별도 구매 도메인을 사용할까, Vercel 기본 도메인으로 시작할까?
4. GitHub repository는 `CWDll/uniwork` 이름으로 생성할까, 다른 이름을 쓸까?
