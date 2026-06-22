---
template: design
version: 1.2
feature: bible-reading-tracker
date: 2026-06-20
author: jhkim8
project: Bible Reading Tracker
version_project: 0.9.0
---

# Bible Reading Tracker 설계 문서

> **요약**: 오프라인 우선(offline-first) React Native(Expo) 앱으로, 로컬 SQLite를 단일 진실원본(source of truth)으로 사용하고 Supabase(Postgres + Auth + Realtime + RLS)와 멱등 업서트 기반으로 동기화하는 성경 통독 트래커.
>
> **Project**: Bible Reading Tracker
> **Version**: 0.9.0
> **Author**: jhkim8
> **Date**: 2026-06-20
> **Status**: Reviewed (doc v0.2 — design-validator 검토 반영)
> **Planning Doc**: [bible-reading-tracker.plan.md](../../01-plan/features/bible-reading-tracker.plan.md)
> **Figma**: DoLF — "Tracker" 페이지 App 프레임 (390×844, 00 Start ~ Group dashboard 등 26개)

### Pipeline References

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 | Schema Definition (본 문서 §3) | ✅ (본 문서에 통합) |
| Phase 2 | Coding Conventions (본 문서 §10) | ✅ (본 문서에 통합) |
| Phase 3 | Mockup (Figma "Tracker" App 프레임) | ✅ 외부(Figma) |
| Phase 4 | API Spec (본 문서 §4 — Supabase 자동 REST + RPC) | ✅ (본 문서에 통합) |

---

## 1. 개요 (Overview)

### 1.1 설계 목표 (Design Goals)

1. **오프라인 우선**: 네트워크 없이 체크/조회/통계/추천이 100% 동작 (비기능 요구사항 충족). SQLite가 로컬 진실원본.
2. **결정론적 시각화**: 1,189장·31,102절 메타데이터로 점 매트릭스를 항상 동일하게 렌더. **장 매트릭스 점 크기 = 장 길이(장별 절 수, `verse-counts.verses[]`에서 파생)**, **절 그리드 점 크기 = 절 글자수 단계(`verse-length-steps`)** — 두 데이터의 단위가 다름에 유의(§3.2).
3. **멱등 동기화**: `reading_log`를 `(user, book, chapter)` 단위 멱등 업서트로 멀티 기기 충돌을 last-write-wins로 해소.
4. **순수 도메인 로직 분리**: 진행률·streak·분량 추천을 외부 의존 없는 순수 함수로 → 단위 테스트 80%+ 용이.
5. **Phase 2 전방 호환**: MVP 스키마/RLS를 소셜(그룹·리더보드) 확장에도 깨지지 않도록 설계.

> **설계 범위 (Plan v2.0 반영)**: 본 문서는 **MVP = 통독 트래커 엔진**의 설계다. Plan이 v2.0에서 **커뮤니티-first 교회 SNS**(피드·게시물 4종·팔로우·모더레이션, Plan §4.5 / FR-29~41)로 확장되었으나, 커뮤니티는 **Phase 2(비공개 베타)의 독립 설계 문서**(`*-community.design.md`)로 별도 작성한다. 단, MVP 데이터/인증/RLS·Storage 기반은 커뮤니티 확장과 충돌하지 않도록 전방 호환으로 둔다(§3.1·§7). 본 문서의 트래커 설계는 그대로 유효.

### 1.2 설계 원칙 (Design Principles)

- **Single source of truth (local)**: UI는 SQLite만 읽고, 동기화 레이어가 Supabase와 양방향 조정.
- **Domain purity**: `src/domain/`은 React/Expo/Supabase를 import하지 않음 (순수 TS).
- **Service abstraction**: Supabase 직접 호출은 `src/services/`·`src/lib/`에만. 도메인/화면은 BaaS를 모름 → 백엔드 교체 가능(위험 대응 "BaaS 종속성").
- **Static data is bundled**: 성경 66권 메타·절 수·길이 단계는 앱 번들 정적 자산(`src/data/`), 서버 왕복 없음.
- **Immutable updates**: 상태는 항상 새 객체 생성 (no mutation).

---

## 2. 아키텍처 (Architecture)

### 2.1 컴포넌트 다이어그램

```
┌──────────────────────────────────────────────────────────┐
│                  React Native (Expo) App                  │
│                                                            │
│  Presentation (app/ 화면 · components/ · hooks/)          │
│        │ reads/writes                                      │
│        ▼                                                   │
│  Application (stores/ Zustand · services/)                 │
│        │                  │                                │
│        ▼                  ▼                                │
│  Domain (domain/        Infrastructure                     │
│  progress·streak·       (db/ SQLite · lib/supabase ·       │
│  recommend 순수)         lib/sync · notifications)         │
│                              │ offline-first               │
└──────────────────────────────┼─────────────────────────────┘
                               │ HTTPS (online only)
                               ▼
              ┌────────────────────────────────┐
              │           Supabase             │
              │  Auth · Postgres(RLS) · Realtime│
              └────────────────────────────────┘
```

### 2.2 데이터 흐름 (오프라인 우선)

```
[체크 탭] → Zustand action → SQLite UPSERT(reading_log, dirty=1)
          → 도메인 재계산(progress/streak) → UI 즉시 갱신 (<200ms)
          → (온라인 시) SyncQueue → Supabase upsert → dirty=0
          → Realtime/pull → 다른 기기 변경 머지(last-write-wins)
```

### 2.3 동기화 전략 (Sync)

| 항목 | 규칙 |
|------|------|
| 진실원본 | 로컬 SQLite (UI는 항상 로컬만 읽음) |
| 쓰기 | 로컬 즉시 반영 + `dirty` 플래그, 백그라운드 push |
| 충돌 해결 | 서버 `updated_at` 기준 **last-write-wins**. `reading_log`는 `(user_id, cycle, book_order, chapter)` 유니크 → **멱등 업서트** |
| **타이브레이커** | `updated_at` 동률 시 **`read=true` 우선**(읽음 보존이 사용자 의도에 안전). `read`는 불리언이라 이 한 단계로 두 기기가 **결정론적으로 수렴**(값이 둘뿐) → `reading_log`엔 추가 기준 불필요. id 사전순 3차 기준은 비불리언 필드 도입 시에만 적용 (D-1 확정) |
| 삭제(체크 해제) | soft-delete: `read=false`, **`read_at=null`**, `updated_at=now()`. 물리 삭제 안 함 → 동기화 일관성 |
| **dirty 보호** | pull 머지 시 **로컬 `dirty=1` 행은 서버 push로 덮지 않음** — 로컬 미전송 변경을 우선 flush 후, 서버가 더 최신이면 그때 머지(로컬 변경 유실 방지) |
| 풀(pull) | 로그인 직후 + Realtime 구독(`reading_log`, Phase 2: `group_member`). `WHERE updated_at > last_synced_at` |
| 큐 | **멱등 엔티티(reading_log 등)는 행별 `dirty` 플래그 기반 push가 1차 메커니즘**(중복 적재 없이 단순·견고). `sync_queue`는 **비멱등 작업(예: 미디어 업로드, 순서 의존 작업)용으로 예약** (D-2 확정) |

### 2.4 의존성

| 컴포넌트 | 의존 | 목적 |
|----------|------|------|
| Presentation | Application, Domain | 화면 렌더·이벤트 |
| stores (Zustand) | services, domain | 상태 보관·액션 |
| services | db, lib(supabase/sync), domain | 유스케이스 오케스트레이션 |
| domain | (없음 — 순수) | 진행률·streak·추천 계산 |
| db (SQLite) | domain types | 로컬 영속화 |
| lib/sync | db, lib/supabase | 양방향 동기화 |

---

## 3. 데이터 모델 (Data Model)

> Postgres(Supabase)와 로컬 SQLite는 **동일 논리 스키마**를 공유. 정적 성경 데이터는 양쪽 모두 번들/시드.

### 3.1 엔티티 관계 (ER)

```
[auth.users] 1─1 [profile]
   │ 1
   ├──N [reading_log]      (book_id, chapter, read, read_at)
   ├──1 [streak]
   ├──N [achievement]
   ├──1 [user_plan] ─N─→ [reading_plan](정적)
   └──(Phase2) N [group_member]─N─[group], N [friendship], N [challenge_member]

[book](정적) 1─N [reading_log]
[bible_version](정적) 1─N [verse](정적/캐시)
```

### 3.2 정적 데이터 (앱 번들, 서버 시드)

이미 확보된 두 JSON을 `src/data/`로 번들. 런타임 네트워크 불필요. **두 파일의 인코딩 단위가 다르므로 혼동 주의**:

| 파일 | 단위 | 의미 | 검증 |
|------|------|------|------|
| `verse-counts.json` | **장(chapter)별** | `verses[]` = 각 장의 절 수 | 66권·1,189장·31,102절, 장 합계 1,189 일치 |
| `verse-length-steps.json` | **절(verse)별** ⚠️ | 각 절의 글자수 3분위 단계(0/1/2) 문자열 | Genesis 문자열 길이=**1533**(=총 절수, 장수 50 아님), Obadiah=21절. 모든 책 문자열 길이 == `totalVerses` |

> ⚠️ `verse-counts.json`은 `"version": "KRV-approx (KJV-based standard)"` — **개역한글 정확본이 아닌 KJV계열 근사값**(파일 note 명시). 정확 개역한글 절 수 확보 시 교체 필요(추적 항목, 부록 A.3).

```typescript
// src/types/bible.ts (Domain)
type Testament = 'OT' | 'NT';
type SizeStep = 0 | 1 | 2; // 소/중/대 → 점 반지름 {r0,r1,r2}

interface BibleBook {
  order: number;        // 1..66 — 정규 키(단일 식별자)
  abbr: string;         // "Gen" (verse-counts)
  nameEn: string;       // "Genesis"
  nameKo: string;       // "창세기"
  testament: Testament;
  genre: string;        // 오경/역사서/.../복음서/...
  chapterCount: number; // 50
  totalVerses: number;  // 1533
  verses: number[];     // [장1 절수, 장2 절수, ...] length === chapterCount
}

// 장 매트릭스(DotMatrix)용 — 점 크기는 "장 길이(절 수)"에서 파생
interface ChapterDotMeta {
  bookOrder: number;    // 1..66
  chapter: number;      // 1-based
  verseCount: number;   // = book.verses[chapter-1]
  sizeStep: SizeStep;   // verses[] 분위로 계산(아래)
}

// 절 그리드(VerseGrid, 드릴다운)용 — 점 크기는 "절 글자수 단계"
interface VerseDotMeta {
  bookOrder: number;
  chapter: number;
  verse: number;        // 1-based
  sizeStep: SizeStep;   // verse-length-steps 문자열의 해당 문자
}
```

#### 3.2.1 정적 데이터 어댑터 (키 정규화 + 무결성)

두 JSON은 책 식별자가 다름(`verse-counts`=`abbr`/`name_en`, `verse-length-steps`=전체 영문명 키). **`order`(1..66)를 유일 정규 키로 통일**하고, 빌드/로드 시 어댑터가 결합:

- 결합 규칙: `verse-counts.name_en` → `verse-length-steps` 키, **정확 일치**. (과거 시편이 `name_en="Psalm"`(단수)로 키 `"Psalms"`와 불일치했으나 **데이터를 "Psalms"로 정정** — 정규화 불필요. 불일치 발생 시 무결성 검증에서 차단)
- **점 크기 파생**:
  - 장 매트릭스: `ChapterDotMeta.sizeStep`은 `verses[]`(장별 절 수)에 대해 별도 임계값(예: 전체 1,189장 절수 분포의 3분위)으로 계산 — `verse-length-steps`를 쓰지 않음.
  - 절 그리드: `VerseDotMeta.sizeStep`은 `verse-length-steps[bookKey]`의 누적 오프셋(이전 장들 절수 합)에서 해당 절 문자를 읽어 매핑.
- **무결성 검증 스크립트**(빌드 타임, `tests`/`scripts`): ① 66권 ② 장합 1,189 ③ 각 책 `verses.length === chapterCount` ④ 각 책 `verse-length-steps` 문자열 길이 === `totalVerses` ⑤ 두 JSON 키 1:1 매칭(시편 정규화 포함). 하나라도 실패 시 빌드 실패.

### 3.3 Supabase Postgres 스키마 (MVP)

```sql
-- 프로필 (auth.users 1:1 확장)
create table profile (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  photo_url text,
  locale text default 'ko',
  preferred_version text default 'KRV',   -- KRV | NIV(비활성)
  leaderboard_visibility text default 'private', -- private|group|public
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 장별 읽음 기록 (핵심) — 회차(cycle) 차원 포함, 멱등 업서트 키
create table reading_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle int not null default 1,   -- 회독 회차(1-based). 회독별 기록 보존
  book_order int not null,        -- 1..66 (정적 book 참조; 정적표는 클라 번들)
  chapter int not null,           -- 1-based
  read boolean not null default true,
  read_at timestamptz,
  source text default 'manual',   -- manual|reader|import
  updated_at timestamptz default now(),
  unique (user_id, cycle, book_order, chapter)   -- 회차 포함 멱등 보장
);

-- 회독 진행 상태 (사용자별 현재/완독 회차)
create table reading_cycle (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_cycle int not null default 1,
  completed_cycles int not null default 0,
  started_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 회독 미션 (목표 회차: 사다리 단계 또는 커스텀)
create table reading_mission (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_cycle int not null,      -- 목표 회차 (1,3,5,7,10... 또는 커스텀)
  type text not null default 'ladder', -- ladder | custom
  status text not null default 'active', -- active | achieved
  achieved_at timestamptz,
  updated_at timestamptz default now(),
  unique (user_id, target_cycle)
);

-- 연속 기록
create table streak (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current int default 0,
  longest int default 0,
  last_read_date date,
  updated_at timestamptz default now()
);

-- 성취/배지
create table achievement (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,        -- first_step|week_streak|ot_done|...
  achieved_at timestamptz default now(),
  unique (user_id, badge_key)
);

-- 통독 계획 템플릿 (정적/공용)
create table reading_plan (
  id text primary key,            -- 'year-1' | 'days-90' | 'nt-90' ...
  name text not null,
  total_days int not null,
  order_category text,            -- canonical|nt-first|thematic|chronological|genre
  schedule jsonb not null         -- [{day:1, items:[{bookOrder,chapStart,chapEnd}]}...]
);

-- 사용자가 선택한 계획
create table user_plan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text references reading_plan(id),
  start_date date not null,
  status text default 'active',   -- active|paused|done
  updated_at timestamptz default now(),
  unique (user_id, plan_id, start_date)
);

create index on reading_log (user_id, updated_at);  -- 증분 pull
```

> **reading_plan 시드 (M-1 반영)**: `schedule jsonb` = `[{day, items:[{bookOrder, chapStart, chapEnd}]}]`. MVP는 **성경순(canonical)·1년·90일·신약90일** 4종을 빌드 타임에 `verse-counts`로 생성(균등 분배 알고리즘, `src/data/plans/`에 산출물 번들). 주제별/연대기/장르별 순서(Plan §6.0)는 Phase 2. 생성 스크립트도 §3.2.1 무결성 검증에 포함(장 누락/중복 0).
>
> **verse(본문) 테이블 & MVP 경계 (H-3 반영)**: Plan에서 FR-01a(개역한글 본문 읽기)는 MVP/High이나, 본문 데이터·라이선스(대한성서공회 서면 확인, 부록 A)에 의존. **결정: FR-01a를 "라이선스 확보 블로커"로 명시** — 본문(Reader)은 라이선스+데이터 확보 시 `verse(version_id, book_order, chapter, verse, text)` 시드로 활성화하고, 확보 전 MVP에서는 **장/절 체크·진행 추적은 본문 없이 완전 동작**(체크 트래킹이 MVP의 진짜 핵심). 확보가 지연되면 Reader는 Phase 2로 강등(Plan과 합의 필요). 절 단위 체크는 `reading_log`에 `verse int null` 컬럼 추가로 확장(드릴다운).
>
> **번역본별 절 수 (H-4 반영)**: 현재 정적 데이터는 **단일(KRV 근사) 절 수 1종**뿐. **MVP는 이 단일 데이터셋만 사용**. 온보딩의 번역본 선택(KRV/NIV)에 따른 **번역본별 절 수 분기는 Phase 2**로 분리(`verse.version_id`별 데이터셋 확보 후). `profile.preferred_version`은 MVP에서 표기/설정값으로만 보관.

### 3.5 회독(Multiple Read-Throughs) 도메인 규칙 (Plan §4.4)

> **결정**: 회차별 순차 트래킹 + 미션 사다리(고정+커스텀) + 누적 농도/링 시각화.

```typescript
// src/domain/cycle.ts (순수 함수)
// 한 회차 완독 여부: 해당 cycle의 read=true 장이 1,189개
function isCycleComplete(readChaptersInCycle: number): boolean // === TOTAL_CHAPTERS(1189)

// 장별 누적 회독 깊이: 해당 (book,chapter)를 read한 cycle 수
type DepthByChapter = Map<string, number>; // key=`${bookOrder}:${chapter}` → depth(0..currentCycle)

// 시각화 농도 단계: depth → 무채색 농담 step (예: 0=연회색, 1..N 점진적 잉크 농도/링 가산)
function depthToInkStep(depth: number, maxCycleSeen: number): number
```

| 규칙 | 내용 |
|------|------|
| 현재 회차 | `reading_cycle.current_cycle`. 현재 회차의 1,189장 완성 시 `completed_cycles++`, `current_cycle++` (도메인이 계산, services가 영속화) |
| 완독 회차 수 | `completed_cycles` = 1,189장을 모두 채운 회차의 수 |
| 미션 사다리 | 기본 `[1,3,5,7,10,...]` 상수. 현재 미션 = `completed_cycles` 초과 첫 목표. 달성 시 `reading_mission.status='achieved'` + 다음 단계 active 생성 |
| 커스텀 목표 | `reading_mission.type='custom'`, 사다리와 병존 가능(둘 중 가까운 목표를 "다음 목표"로 표시) |
| 시각화 | DotMatrix는 `read` 이진이 아니라 **누적 깊이(depth)**로 농도/링 렌더. "현재 회차만 보기"는 `cycle===current_cycle` 필터, "전체 누적 보기"는 depth (추후 토글) |
| 회독 완료 연출 | 회차 완성 시 Completed/Badge unlocked 모달 + 회독 배지(3·7·10독 등, Plan §5.1) |
| 동기화 | `reading_log` 멱등키에 `cycle` 포함. `reading_cycle`/`reading_mission`도 last-write-wins 업서트 |

### 3.4 로컬 SQLite 스키마 (오프라인)

Postgres와 동일 컬럼 + 동기화 메타 컬럼 추가:

```sql
CREATE TABLE reading_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  cycle INTEGER NOT NULL DEFAULT 1,     -- 회독 회차
  book_order INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  read INTEGER NOT NULL DEFAULT 1,
  read_at TEXT,
  source TEXT DEFAULT 'manual',
  updated_at TEXT NOT NULL,
  dirty INTEGER NOT NULL DEFAULT 1,     -- 1=미동기화
  UNIQUE (user_id, cycle, book_order, chapter)
);
CREATE TABLE reading_cycle (
  user_id TEXT PRIMARY KEY,
  current_cycle INTEGER NOT NULL DEFAULT 1,
  completed_cycles INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL, dirty INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT NOT NULL, op TEXT NOT NULL, payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE sync_meta (entity TEXT PRIMARY KEY, last_synced_at TEXT);
-- reading_mission / streak / achievement / user_plan 동일 패턴(+dirty)
```

---

## 4. API 명세 (API Specification)

> Supabase는 테이블 생성 시 **REST + Realtime을 자동 제공**하므로 별도 서버 구현 없음. 클라이언트는 `@supabase/supabase-js`로 접근하고, 복잡 집계는 **RPC(Postgres 함수)** 로 처리.

### 4.1 데이터 접근 (services 레이어)

| 유스케이스 | Supabase 호출 | 비고 |
|------------|---------------|------|
| 읽음 체크/해제 | `from('reading_log').upsert({...}, {onConflict:'user_id,book_order,chapter'})` | 멱등 |
| 증분 pull | `from('reading_log').select().gt('updated_at', lastSynced)` | 동기화 |
| 프로필 | `from('profile').upsert()` / `.select().single()` | 온보딩 |
| streak/achievement | `upsert` | last-write-wins |
| 실시간 | `channel('reading_log').on('postgres_changes', ...)` | 멀티 기기 |

### 4.2 RPC (집계 — 선택, 통계 화면)

```sql
-- 현재 회차(current_cycle) 기준 전체/구약/신약 진행률 (DM-6: cycle 미필터 시 2독+ 사용자 100% 초과 버그)
create function progress_summary(p_user uuid)
returns table(total int, read int, ot_read int, nt_read int)
language sql security definer as $$
  select 1189,
    count(*) filter (where rl.read),
    count(*) filter (where rl.read and rl.book_order <= 39),
    count(*) filter (where rl.read and rl.book_order >= 40)
  from reading_log rl
  join reading_cycle rc on rc.user_id = rl.user_id
  where rl.user_id = p_user and rl.cycle = rc.current_cycle;
$$;
```

> **진행률 기준 (DM-6)**: 모든 진행률 계산은 **현재 회차(`current_cycle`)** 기준. 전체 누적(회독 깊이)은 별도 집계로 분리 — 현재 회차 진행률과 혼용 금지.

> 오프라인에서는 동일 계산을 `src/domain/progress.ts` 순수 함수로 수행(서버 RPC는 통계 화면 가속·검증용).

### 4.3 인증 (Auth)

| 흐름 | API |
|------|-----|
| 이메일 가입/로그인 | `supabase.auth.signUp` / `signInWithPassword` |
| 소셜 (Apple/Google) | `supabase.auth.signInWithIdToken` (Expo AuthSession) |
| 세션 영속 | `expo-secure-store` 어댑터 (토큰 안전 저장) |
| 게스트→로그인 병합 | 로컬 `reading_log`를 로그인 후 user_id로 재라벨 후 push |

---

## 5. UI/UX 설계

### 5.1 화면 흐름 (Figma App 프레임 매핑)

```
00 Start → 01 Onboarding(Translation→Plan→Reminder) → [Auth Sign in/up]
        → (tabs) 02 Home ──┬── 03 Tracker (Chapters, 장르별 점 매트릭스)
                           │        └── 04 Verse drilldown (절 그리드)
                           ├── 05 Stats / Overview(progress map)
                           ├── Tracker Hub (분류별 진행)
                           ├── Reader (KRV 본문)
                           └── 07 More
   완독/배지 → 06 Completed · Badge unlocked(modal) · Share card
   (Phase 2) Group dashboard · Leaderboard · Challenges
   States: offline/sync/loading/error · QT(coming soon)
```

### 5.2 핵심 컴포넌트 — 비례 점 매트릭스 (Plan §4.3)

| 컴포넌트 | 책임 | 위치 |
|----------|------|------|
| `DotMatrix` | 장르별 행=책/열=장 렌더 (react-native-svg). 점 크기 입력 = `ChapterDotMeta.sizeStep`(**장 길이=절 수 파생**, §3.2.1) | `components/tracker/` |
| `ChapterDot` | 점 1개. 반지름=sizeStep(소/중/대)→{r0,r1,r2}, 채움=읽음(잉크검정)/안읽음(연회색), 히트박스 확대(원칙 6) | `components/tracker/` |
| `VerseGrid` | 한 장 → 절 점 그리드(드릴다운), 절번호 표기. 점 크기 입력 = `VerseDotMeta.sizeStep`(**절 글자수 단계**, `verse-length-steps`) | `components/tracker/` |
| `ProgressRing` | 전체 원형 게이지 (% + 남은 장) | `components/progress/` |
| `BookProgressBar` | 책별 진행 바 (Tracker Hub) | `components/progress/` |
| `StreakCalendar` | 연속일 히트맵 | `components/streak/` |
| `BadgeShelf` | 배지 진열(미획득 실루엣) | `components/achievement/` |

**렌더 규칙**(결정론적): 모바일 기본 **10열 wrap**(시편 등 가로 스크롤 방지), 태블릿 15~20열. 점 반지름은 `sizeStep`(0/1/2)→`{r0,r1,r2}` 상수 매핑. 배경은 종이색(off-white) 고정.

**회독 누적 렌더 (Plan §4.4, §3.5)**: 점 채움은 읽음/안읽음 이진이 아니라 **누적 회독 깊이(depth = 그 장을 읽은 회차 수)** 를 무채색 농담/링으로 표현 → 깊을수록 진한 잉크. `DepthByChapter`를 입력으로 받아 `depthToInkStep`으로 단계화. "현재 회차만 보기 / 전체 누적 보기" 토글(추후). 회차 완성 시 Completed·Badge 모달 연출.

### 5.3 상태/접근성

- 빈 상태(Home empty), 로딩/오프라인/동기화/에러(States 프레임) 별도 처리.
- 색맹 대비: 읽음/안읽음을 색이 아닌 **채움(명도)**로 구분(무채색 정책과 일치).
- 글꼴 확대·명도 대비 WCAG AA, 점이 작아도 탭 영역 ≥ 44pt.

---

## 6. 에러 처리 (Error Handling)

| 상황 | 코드/유형 | 처리 |
|------|----------|------|
| 입력 검증 실패 | `VALIDATION` | zod 파싱, 폼 인라인 메시지 |
| 인증 실패 | `AUTH` (401) | 로그인 화면 리다이렉트, 세션 정리 |
| 네트워크 없음 | `OFFLINE` | 로컬 동작 유지, "오프라인" 배너, dirty 큐 적재 |
| 동기화 충돌 | `SYNC_CONFLICT` | last-write-wins 자동 해소, 사용자 무중단 |
| 서버 오류 | `SERVER` (5xx) | 지수 백오프 재시도(최대 N), 로깅 |

```typescript
interface AppError { code: 'VALIDATION'|'AUTH'|'OFFLINE'|'SYNC_CONFLICT'|'SERVER';
  message: string; cause?: unknown }
```

모든 외부 호출은 try/catch로 `AppError`로 정규화 후 상위 전파(전역 console.log 금지, 로거 사용).

---

## 7. 보안 고려사항 (Security)

- [x] **RLS 전면 적용** — 모든 사용자 테이블에 "본인 행만" 정책.
- [x] 인증 토큰 `expo-secure-store` 저장, 전송 HTTPS.
- [x] 입력 검증 zod (체크 payload, 온보딩).
- [x] 리더보드/그룹 노출은 명시적 옵트인(기본 private).
- [ ] (Phase 2) 그룹/친구 범위 RLS — `group_member` 조인 기반 가시성.

```sql
alter table reading_log enable row level security;
create policy "own rows" on reading_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- profile/streak/achievement/user_plan/reading_cycle/reading_mission 동일 패턴("본인 행만")
-- reading_plan: 공용 읽기 전용
create policy "plans readable" on reading_plan for select using (true);
```

---

## 8. 테스트 계획 (Test Plan)

### 8.1 범위

| 유형 | 대상 | 도구 |
|------|------|------|
| 단위 | `domain/` 진행률·streak·분량추천·점크기매핑 | Jest |
| 단위 | SQLite 쿼리(업서트/멱등/soft-delete) | Jest + better-sqlite(테스트) |
| 통합 | sync flush/pull, 충돌 해소 | Jest (Supabase mock/local) |
| 컴포넌트 | DotMatrix/ProgressRing 렌더·탭 | RN Testing Library |
| E2E | 온보딩→체크→진행률, 오프라인→동기화 | (선택) Detox |

### 8.2 핵심 테스트 케이스

- [ ] Happy: 장 체크 시 진행률·streak 즉시 갱신, 점 채움.
- [ ] 멱등: 같은 장 2회 체크 → reading_log 1행, 중복 없음.
- [ ] 오프라인: 비행기 모드 체크 → 재연결 시 dirty가 0이 되고 서버 반영.
- [ ] 충돌: 두 기기 같은 장 다른 시각 수정 → 최신 updated_at 승.
- [ ] Edge: 시편 150장 10열 wrap 렌더 60fps, 가로 스크롤 없음.
- [ ] streak: 자정 경계·하루 건너뜀 시 current 리셋, longest 유지.
- [ ] recommend: 계획 대비 밀림(catch-up) 시 남은 일수 재분배·일일 상한 적용, 앞서감(ahead) 시 가벼운 분량 제시, 계획 미선택 시 균등 분배(다음 미읽은 구간).
- [ ] 정적 데이터 무결성: 66권·장합 1189·`verses.length==chapterCount`·steps길이==totalVerses·키 매칭(시편 정규화) 전수 통과(§3.2.1).

> 목표 커버리지 80%+ (도메인 로직 우선).

---

## 9. 클린 아키텍처 (Clean Architecture)

### 9.1 레이어 구조 (Expo/RN 매핑)

| Layer | 책임 | 위치 |
|-------|------|------|
| **Presentation** | 화면·UI·hooks | `app/`, `src/components/`, `src/features/*/hooks/` |
| **Application** | 유스케이스·서비스·스토어 | `src/services/`, `src/stores/` |
| **Domain** | 엔티티·순수 규칙(진행률/streak/추천) | `src/types/`, `src/domain/` |
| **Infrastructure** | SQLite·Supabase·sync·알림 | `src/db/`, `src/lib/` |

### 9.2 의존성 규칙

```
Presentation → Application → Domain ← Infrastructure
                   └────────→ Infrastructure
규칙: 안쪽(Domain)은 바깥을 import하지 않음. Domain은 react/expo/supabase 의존 0.
```

### 9.3 이 기능의 레이어 배치

| 컴포넌트 | Layer | 위치 |
|----------|-------|------|
| DotMatrix / ProgressRing | Presentation | `src/components/tracker|progress/` |
| readingService (체크/조회) | Application | `src/services/reading.ts` |
| syncService | Application | `src/services/sync.ts` |
| progress/streak/recommend | Domain | `src/domain/*.ts` (순수) |
| BibleBook/ReadingLog 타입 | Domain | `src/types/*.ts` |
| sqlite 클라이언트·쿼리 | Infrastructure | `src/db/` |
| supabase 클라이언트 | Infrastructure | `src/lib/supabase.ts` |

---

## 10. 코딩 컨벤션 (Convention)

### 10.1 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `DotMatrix`, `ProgressRing` |
| 함수 | camelCase | `calcProgress()`, `toggleChapter()` |
| 상수 | UPPER_SNAKE_CASE | `TOTAL_CHAPTERS`, `DOT_RADIUS` |
| 타입/인터페이스 | PascalCase | `BibleBook`, `ReadingLog` |
| 컴포넌트 파일 | PascalCase.tsx | `DotMatrix.tsx` |
| 유틸/도메인 파일 | camelCase.ts / kebab | `progress.ts`, `reading.ts` |
| 폴더 | kebab-case | `features/tracker/` |

### 10.2 환경변수

| 변수 | 용도 | 범위 |
|------|------|------|
| `EXPO_PUBLIC_SUPABASE_URL` | BaaS 엔드포인트 | Client |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | 공개 키 | Client |
| `EAS_PROJECT_ID` | 빌드/배포 | Build |

### 10.3 이 기능의 컨벤션 적용

| 항목 | 적용 |
|------|------|
| 상태관리 | Zustand 스토어(feature별), 액션은 서비스 호출 |
| 불변성 | 항상 새 객체/배열 생성, 직접 mutation 금지 |
| 에러 처리 | `AppError`로 정규화, 오프라인 폴백 |
| 정적 데이터 | `src/data/`에 번들 (JSON import) |

---

## 11. 구현 가이드 (Implementation Guide)

### 11.1 파일 구조

```
bible-reading-tracker/
├── app/                         # Expo Router
│   ├── (auth)/sign-in | sign-up
│   ├── (onboarding)/translation | plan | reminder
│   ├── (tabs)/index(home) | tracker | stats | more
│   ├── tracker/[genre].tsx      # 장르별 점 매트릭스
│   ├── tracker/[book]/[chapter].tsx  # 절 드릴다운
│   └── _layout.tsx
├── src/
│   ├── components/  tracker/ progress/ streak/ achievement/ ui/
│   ├── features/    reading/ plan/ stats/ achievements/ auth/
│   ├── services/    reading.ts sync.ts auth.ts plan.ts
│   ├── stores/      reading.store.ts ui.store.ts
│   ├── domain/      progress.ts streak.ts recommend.ts dot-size.ts
│   ├── db/          schema.sql client.ts queries/
│   ├── lib/         supabase.ts sync/ notifications.ts errors.ts
│   ├── data/        verse-counts.json verse-length-steps.json (from /data/bible)
│   └── types/       bible.ts reading.ts
├── supabase/        migrations/ (schema §3.3 + RLS §7)
└── tests/
```

### 11.2 구현 순서

1. [ ] Expo 프로젝트 스캐폴딩(Router/TS/Zustand) + `/data/bible` JSON을 `src/data/`로 번들 + **정적 데이터 어댑터·무결성 검증 스크립트(§3.2.1) 먼저 통과**(C-1/C-2 블로커 해소)
2. [ ] Domain 순수 로직 + 단위 테스트 (progress/streak/recommend/dot-size/**cycle 회독·미션·depth**) — **TDD 먼저**
3. [ ] SQLite 스키마·쿼리(reading_log 멱등 업서트, soft-delete) + 테스트
4. [ ] Tracker 화면: DotMatrix/VerseGrid/ProgressRing (Figma 03/04/Hub 매핑)
5. [ ] Supabase 프로젝트·마이그레이션·RLS, auth(이메일/소셜)
6. [ ] syncService(push/pull/queue/Realtime) + 오프라인·충돌 테스트
7. [ ] 온보딩(번역본/계획/알림) + 알림(Expo Notifications)
8. [ ] 통계/배지/완독 모달, 다크모드·i18n
9. [ ] `/pdca analyze`로 Gap 검증 (목표 Match ≥ 90%)

---

## 부록. Plan과의 추적성 (Traceability)

| Plan FR | 설계 반영 위치 |
|---------|---------------|
| FR-01/02/03 장 체크·진행률·시각화 | §3.3 reading_log, §5.2 DotMatrix, §4.2 진행률 |
| FR-04/04a/05 계획·순서·오늘분량 | §3.3 reading_plan/user_plan, domain/recommend |
| FR-06 streak | §3.3 streak, domain/streak |
| FR-07 통계 | §4.2 RPC, Stats 화면 |
| FR-08 배지 | §3.3 achievement, BadgeShelf |
| FR-09 알림 | §11 notifications.ts |
| FR-10/11 인증 | §4.3 Auth |
| FR-12/13 동기화/오프라인 | §2.3 Sync, §3.4 SQLite, §8 테스트 |
| FR-14 다크/다국어 | §5.3, §11 |
| FR-15 백업/복원 | 계정 기반 Supabase 동기화로 충족(별도 export/import 화면 불요). 전체 재설치 시 로그인→pull로 복원 |
| FR-26 회독 누적 추적 | §3.3 reading_log.cycle + reading_cycle, §3.5 도메인 규칙 |
| FR-27 회독 미션 사다리 | §3.3 reading_mission, §3.5 미션/커스텀 규칙 |
| FR-28 누적 회독 시각화 | §5.2 회독 누적 렌더(depth→농도/링), §3.5 depthToInkStep |
| FR-16~21 소셜(Phase 2) | §3.1·§7 전방호환 스키마/RLS |

---

## 버전 이력 (Version History)

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 0.1 | 2026-06-20 | 최초 설계 초안 — 오프라인 우선 아키텍처, Supabase 스키마+RLS, SQLite 미러, 동기화 전략, 점 매트릭스 컴포넌트 설계, Figma App 프레임 매핑, 테스트 계획, Plan 추적성 | jhkim8 |
| 0.2 | 2026-06-20 | design-validator 검토 반영 — C-1(verse-length-steps는 절별 데이터로 정정, 장 매트릭스 점크기는 verses[]에서 파생), C-2(order 정규키 통일+어댑터+무결성 검증, 시편 Psalm/Psalms 정규화), H-1(동기화 타이브레이커·read_at·dirty 보호), H-2(FR-15 추적성), H-3(Reader/FR-01a MVP 경계 명시), H-4(MVP 단일 KRV 절수, 번역본별은 Phase 2), M-1(reading_plan 시드), M-2(recommend 테스트케이스) | jhkim8 |
| 0.3 | 2026-06-20 | **회독(N독) 누적 컨셉 반영(Plan v1.0)** — reading_log에 cycle 차원 추가(멱등키=user+cycle+book+chapter), reading_cycle/reading_mission 테이블·RLS·SQLite 미러, §3.5 회독 도메인 규칙(현재/완독 회차·미션 사다리+커스텀·depth 시각화), §5.2 누적 농도/링 렌더, FR-26~28 추적성, 동기화 키/구현 순서 갱신 | jhkim8 |
| 0.4 | 2026-06-20 | Plan v2.0 커뮤니티 전환 범위노트 + 재검토 DM-6 반영 — progress_summary RPC를 current_cycle 기준으로 수정(2독+ 진행률 100% 초과 버그 방지), 진행률은 현재 회차 기준·전체 누적과 분리 명시. 커뮤니티 상세 설계는 *-community.design.md로 분리 | jhkim8 |
| 0.5 | 2026-06-20 | 데이터 정정 — `verse-counts.json` 시편 `name_en` 단수 "Psalm" → "Psalms"(정식 명칭)로 수정. 두 데이터셋 키가 정확 일치하게 되어 §3.2.1 정규화(Psalm→Psalms) 제거, 어댑터는 정확 일치만 허용 | jhkim8 |
| 0.6 | 2026-06-21 | PDCA Check(Gap 분석, Match 96%) 반영 — §2.3 타이브레이커 명확화(불리언 read는 read=true 우선으로 결정론적 수렴, id 사전순은 비불리언 전용, D-1), sync_queue는 멱등 엔티티 미사용·비멱등 작업용 예약(D-2). 분석 리포트 docs/03-analysis/bible-reading-tracker.analysis.md | jhkim8 |
