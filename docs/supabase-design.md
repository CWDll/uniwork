# Supabase Auth and Schema Plan

작성일: 2026-07-05

## Direction

Uniwork는 Next.js App Router와 Supabase를 연결한다. Supabase는 Auth, Postgres, Storage, Row Level Security를 담당한다.

1차 MVP는 `D-2`, `D-4` 유학생 구직자와 기업 회원을 중심으로 한다. 행정사 전달은 구직자가 직접 행정사를 고르는 방식이 아니라 운영자가 1차 검토 후 수동 배정하는 방식으로 간다.

## Auth Roles

Supabase Auth의 `auth.users`를 로그인 원천으로 두고, 앱 내부 권한은 `profiles.role`로 관리한다.

- `seeker`: 구직자
- `company`: 기업 담당자
- `admin`: 운영자
- `partner`: 행정사/파트너

초기 가입 시에는 `seeker`, `company`만 공개 가입을 허용한다. `admin`, `partner`는 운영자가 직접 부여한다.

## Core Tables

### profiles

- `id uuid primary key references auth.users(id)`
- `role text not null`
- `email text not null`
- `name text`
- `phone text`
- `locale text default 'ko'`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### seeker_profiles

- `user_id uuid primary key references profiles(id)`
- `nationality text`
- `visa_type text`
- `visa_review_status text`
- `alien_registration_status text`
- `school text`
- `major text`
- `korean_level text`
- `english_level text`
- `preferred_locations text[]`
- `preferred_job_types text[]`
- `available_times jsonb`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### visa_eligibility_rules

- `visa_type text primary key`
- `can_browse boolean not null default true`
- `can_apply boolean not null default false`
- `needs_review boolean not null default true`
- `blocked_reason text`

Initial rules:

- `D-2`: browse true, apply true, needs review true
- `D-4`: browse true, apply true, needs review true
- `F-1`: browse true, apply false, needs review false
- `F-2`: browse true, apply false, needs review true
- `F-3`: browse true, apply false, needs review false
- `F-4`: browse true, apply false, needs review false

### companies

- `id uuid primary key`
- `owner_id uuid not null references profiles(id)`
- `name text not null`
- `business_number text`
- `industry text`
- `address text`
- `manager_name text`
- `manager_phone text`
- `verification_status text default 'pending'`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### jobs

- `id uuid primary key`
- `company_id uuid not null references companies(id)`
- `title text not null`
- `description text not null`
- `employment_type text`
- `category text`
- `location text`
- `wage_type text`
- `wage_amount numeric`
- `visa_support_type text`
- `korean_requirement text`
- `status text default 'draft'`
- `published_at timestamptz`
- `closed_at timestamptz`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### resumes

- `id uuid primary key`
- `seeker_id uuid not null references profiles(id)`
- `title text`
- `intro text`
- `education jsonb`
- `experience jsonb`
- `languages jsonb`
- `visibility text default 'private'`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### job_applications

- `id uuid primary key`
- `job_id uuid not null references jobs(id)`
- `seeker_id uuid not null references profiles(id)`
- `resume_id uuid references resumes(id)`
- `status text default 'submitted'`
- `message text`
- `applied_at timestamptz default now()`

### admin_requests

- `id uuid primary key`
- `seeker_id uuid not null references profiles(id)`
- `type text not null`
- `consent_id uuid`
- `assigned_partner_id uuid references profiles(id)`
- `status text default 'received'`
- `memo text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### consents

- `id uuid primary key`
- `user_id uuid not null references profiles(id)`
- `purpose text not null`
- `data_scope jsonb not null`
- `recipient_type text`
- `recipient_id uuid`
- `status text default 'agreed'`
- `agreed_at timestamptz default now()`
- `revoked_at timestamptz`

### audit_logs

- `id uuid primary key`
- `actor_id uuid references profiles(id)`
- `action text not null`
- `target_type text not null`
- `target_id uuid`
- `metadata jsonb`
- `created_at timestamptz default now()`

## Storage

Buckets:

- `resume-files`: private
- `admin-request-files`: private
- `company-assets`: public or signed URL based

원칙:

- 외국인등록번호, 여권번호 원본 이미지는 1차 MVP에서 수집하지 않는다.
- 파일은 private bucket에 저장하고 signed URL로만 열람한다.
- 행정사/운영자 열람은 `audit_logs`에 기록한다.

## RLS Policy Draft

- `profiles`: 본인은 자기 row read/update. admin은 전체 read/update.
- `seeker_profiles`: seeker 본인 read/update. company는 지원자에 한해 제한 read. admin/partner는 배정 범위 read.
- `companies`: owner와 admin만 write. public은 verified company 기본 정보 read.
- `jobs`: public은 published read. company owner write. admin approve/reject.
- `job_applications`: seeker 본인 create/read. company owner는 자기 공고 지원 read/update status. admin read.
- `admin_requests`: seeker 본인 create/read. admin 전체 read/update. partner는 assigned request만 read/update status.
- `consents`: user 본인 read/create/revoke. admin read.
- `audit_logs`: server/admin insert. admin read.

## Next Implementation Order

1. Supabase project 생성
2. `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Supabase browser/server client helper 추가
4. Auth callback route 추가
5. signup/login form을 Supabase Auth에 연결
6. `profiles` row 생성 트리거 또는 server action 구현
7. RLS policy 적용
