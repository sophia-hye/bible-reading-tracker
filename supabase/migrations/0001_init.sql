-- Bible Reading Tracker — MVP 트래커 스키마 (Supabase Postgres)
-- 설계 §3.3 / §4.2 / §7. 로컬 SQLite 미러와 동일 논리 + RLS(본인 행만).
-- 모든 테이블/함수는 brt_ 접두사로 네임스페이스. Supabase 대시보드 → SQL Editor 에 붙여 실행.

-- ── 프로필 (auth.users 1:1 확장) ──
create table if not exists public.brt_profile (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  photo_url text,
  locale text default 'ko',
  preferred_version text default 'KRV',
  leaderboard_visibility text default 'private',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 장별 읽음 기록 (핵심, 회차 차원 포함) ──
create table if not exists public.brt_reading_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cycle int not null default 1,
  book_order int not null,
  chapter int not null,
  read boolean not null default true,
  read_at timestamptz,
  source text not null default 'manual',
  updated_at timestamptz default now(),
  unique (user_id, cycle, book_order, chapter)
);
create index if not exists idx_brt_reading_log_user_updated
  on public.brt_reading_log (user_id, updated_at);

-- ── 절 단위 기록 ──
create table if not exists public.brt_verse_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cycle int not null default 1,
  book_order int not null,
  chapter int not null,
  verse int not null,
  read boolean not null default true,
  read_at timestamptz,
  updated_at timestamptz default now(),
  unique (user_id, cycle, book_order, chapter, verse)
);

-- ── 회독 진행 상태 ──
create table if not exists public.brt_reading_cycle (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_cycle int not null default 1,
  completed_cycles int not null default 0,
  updated_at timestamptz default now()
);

-- ── 회독 미션 (목표 회차) ──
create table if not exists public.brt_reading_mission (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_cycle int not null,
  type text not null default 'ladder',
  status text not null default 'active',
  achieved_at timestamptz,
  updated_at timestamptz default now(),
  unique (user_id, target_cycle)
);

-- ── 연속 기록 ──
create table if not exists public.brt_streak (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current int not null default 0,
  longest int not null default 0,
  last_read_date date,
  updated_at timestamptz default now()
);

-- ── 성취/배지 ──
create table if not exists public.brt_achievement (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  badge_key text not null,
  achieved_at timestamptz default now(),
  unique (user_id, badge_key)
);

-- ── RLS: 모든 테이블 "본인 행만" ──
alter table public.brt_profile         enable row level security;
alter table public.brt_reading_log     enable row level security;
alter table public.brt_verse_log       enable row level security;
alter table public.brt_reading_cycle   enable row level security;
alter table public.brt_reading_mission enable row level security;
alter table public.brt_streak          enable row level security;
alter table public.brt_achievement     enable row level security;

do $$
declare t text;
declare col text;
begin
  foreach t in array array[
    'brt_profile','brt_reading_log','brt_verse_log','brt_reading_cycle',
    'brt_reading_mission','brt_streak','brt_achievement'
  ] loop
    col := case when t = 'brt_profile' then 'id' else 'user_id' end;
    execute format(
      'create policy %I on public.%I for all to authenticated using (auth.uid() = %I) with check (auth.uid() = %I)',
      t || '_own', t, col, col
    );
  end loop;
end $$;

-- ── 현재 회차 기준 진행률 RPC (DM-6: cycle 필터 필수) ──
create or replace function public.brt_progress_summary(p_user uuid)
returns table (total int, read int, ot_read int, nt_read int)
language sql security definer as $$
  select 1189,
    count(*) filter (where rl.read)::int,
    count(*) filter (where rl.read and rl.book_order <= 39)::int,
    count(*) filter (where rl.read and rl.book_order >= 40)::int
  from public.brt_reading_log rl
  join public.brt_reading_cycle rc on rc.user_id = rl.user_id
  where rl.user_id = p_user and rl.cycle = rc.current_cycle;
$$;
