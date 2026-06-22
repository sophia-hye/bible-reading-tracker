// 로컬 SQLite 스키마 (설계 §3.4). Postgres와 동일 논리 + 동기화 메타(dirty/queue/meta).

import { SqliteDriver } from './driver';

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS reading_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  cycle INTEGER NOT NULL DEFAULT 1,
  book_order INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  read INTEGER NOT NULL DEFAULT 1,
  read_at TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  updated_at TEXT NOT NULL,
  dirty INTEGER NOT NULL DEFAULT 1,
  UNIQUE (user_id, cycle, book_order, chapter)
);

CREATE INDEX IF NOT EXISTS idx_reading_log_user_cycle
  ON reading_log (user_id, cycle);
CREATE INDEX IF NOT EXISTS idx_reading_log_dirty
  ON reading_log (dirty);

CREATE TABLE IF NOT EXISTS verse_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  cycle INTEGER NOT NULL DEFAULT 1,
  book_order INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  read INTEGER NOT NULL DEFAULT 1,
  read_at TEXT,
  updated_at TEXT NOT NULL,
  dirty INTEGER NOT NULL DEFAULT 1,
  UNIQUE (user_id, cycle, book_order, chapter, verse)
);

CREATE INDEX IF NOT EXISTS idx_verse_log_chapter
  ON verse_log (user_id, cycle, book_order, chapter);

CREATE TABLE IF NOT EXISTS reading_cycle (
  user_id TEXT PRIMARY KEY,
  current_cycle INTEGER NOT NULL DEFAULT 1,
  completed_cycles INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  dirty INTEGER NOT NULL DEFAULT 1
);

-- 예약: 멱등 엔티티는 reading_log.dirty 플래그로 push한다(이 큐 미사용).
-- sync_queue는 향후 비멱등/순서의존 작업(미디어 업로드 등)용. (설계 §2.3 D-2)
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT NOT NULL,
  op TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_meta (
  entity TEXT PRIMARY KEY,
  last_synced_at TEXT
);

-- 본문 캐시 (로컬 전용, 동기화 안 함). version: KRV | KJV
CREATE TABLE IF NOT EXISTS verse_cache (
  version TEXT NOT NULL,
  book_order INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text TEXT NOT NULL,
  PRIMARY KEY (version, book_order, chapter, verse)
);
`;

export function initSchema(driver: SqliteDriver): void {
  driver.exec(SCHEMA_SQL);
}
