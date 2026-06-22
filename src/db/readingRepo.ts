// 읽기 기록 저장소 (Infrastructure). 드라이버에 SQL을 위임.
// 멱등 업서트 / soft-delete / dirty 동기화 / last-write-wins 머지(설계 §2.3).

import { ReadingLogEntry } from '../types/bible';
import { SqliteDriver, SqlValue } from './driver';

export interface SetChapterInput {
  userId: string;
  cycle: number;
  bookOrder: number;
  chapter: number;
  read: boolean;
  /** ISO timestamp */
  now: string;
  source?: string;
}

interface ReadingLogRow {
  id: string;
  user_id: string;
  cycle: number;
  book_order: number;
  chapter: number;
  read: number;
  read_at: string | null;
  source: string;
  updated_at: string;
  dirty: number;
}

/** 자연 키 = 멱등 단위 (user, cycle, book, chapter) */
export function naturalKey(userId: string, cycle: number, bookOrder: number, chapter: number): string {
  return `${userId}:${cycle}:${bookOrder}:${chapter}`;
}

const UPSERT_SQL = `
INSERT INTO reading_log (id, user_id, cycle, book_order, chapter, read, read_at, source, updated_at, dirty)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
ON CONFLICT (user_id, cycle, book_order, chapter) DO UPDATE SET
  read = excluded.read,
  read_at = excluded.read_at,
  source = excluded.source,
  updated_at = excluded.updated_at,
  dirty = 1
`;

/**
 * 장 읽음/해제 설정 (멱등). 체크=read_at 기록, 해제=soft-delete(read=0, read_at=null).
 * 같은 장을 여러 번 호출해도 reading_log에는 1행만 유지된다.
 */
export function setChapterRead(driver: SqliteDriver, input: SetChapterInput): void {
  const { userId, cycle, bookOrder, chapter, read, now, source = 'manual' } = input;
  const readAt = read ? now : null;
  driver.run(UPSERT_SQL, [
    naturalKey(userId, cycle, bookOrder, chapter),
    userId,
    cycle,
    bookOrder,
    chapter,
    read ? 1 : 0,
    readAt,
    source,
    now,
  ]);
}

function rowToEntry(r: ReadingLogRow): ReadingLogEntry {
  return { bookOrder: r.book_order, chapter: r.chapter, cycle: r.cycle, read: r.read === 1 };
}

/** 사용자의 전체 읽기 기록 (도메인 입력용) */
export function getReadingEntries(driver: SqliteDriver, userId: string): ReadingLogEntry[] {
  return driver
    .all<ReadingLogRow>('SELECT * FROM reading_log WHERE user_id = ?', [userId])
    .map(rowToEntry);
}

/** 읽은 날짜(YYYY-MM-DD) 목록 — streak/주간 계산용. read_at 기준, 회차 무관 */
export function getReadDates(driver: SqliteDriver, userId: string): string[] {
  return driver
    .all<{ d: string }>(
      "SELECT DISTINCT substr(read_at, 1, 10) AS d FROM reading_log WHERE user_id = ? AND read = 1 AND read_at IS NOT NULL ORDER BY d",
      [userId],
    )
    .map((r) => r.d);
}

/** 특정 회차에서 읽은 장 수 */
export function countReadInCycle(driver: SqliteDriver, userId: string, cycle: number): number {
  const row = driver.get<{ n: number }>(
    'SELECT COUNT(*) AS n FROM reading_log WHERE user_id = ? AND cycle = ? AND read = 1',
    [userId, cycle],
  );
  return row?.n ?? 0;
}

/** 미동기화(dirty) 읽기 기록 */
export function getDirtyReadingLogs(driver: SqliteDriver, userId: string): ReadingLogEntry[] {
  return driver
    .all<ReadingLogRow>('SELECT * FROM reading_log WHERE user_id = ? AND dirty = 1', [userId])
    .map(rowToEntry);
}

/** 미동기화 읽기 기록을 push 페이로드(서버 행 형태 + 로컬 id)로 조회 */
export function getDirtyReadingRows(
  driver: SqliteDriver,
  userId: string,
): Array<{ id: string } & RemoteReadingLog> {
  return driver
    .all<ReadingLogRow>('SELECT * FROM reading_log WHERE user_id = ? AND dirty = 1', [userId])
    .map((r) => ({
      id: r.id,
      userId: r.user_id,
      cycle: r.cycle,
      bookOrder: r.book_order,
      chapter: r.chapter,
      read: r.read === 1,
      readAt: r.read_at,
      updatedAt: r.updated_at,
      source: r.source,
    }));
}

/** 동기화 완료 표시 */
export function markReadingLogsSynced(driver: SqliteDriver, ids: string[]): void {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(', ');
  driver.run(`UPDATE reading_log SET dirty = 0 WHERE id IN (${placeholders})`, ids as SqlValue[]);
}

// ---- 절(verse) 단위 기록 (verse_log) ----

export interface SetVerseInput {
  userId: string;
  cycle: number;
  bookOrder: number;
  chapter: number;
  verse: number;
  read: boolean;
  now: string;
}

export function verseKey(
  userId: string,
  cycle: number,
  bookOrder: number,
  chapter: number,
  verse: number,
): string {
  return `${userId}:${cycle}:${bookOrder}:${chapter}:${verse}`;
}

const VERSE_UPSERT_SQL = `
INSERT INTO verse_log (id, user_id, cycle, book_order, chapter, verse, read, read_at, updated_at, dirty)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
ON CONFLICT (user_id, cycle, book_order, chapter, verse) DO UPDATE SET
  read = excluded.read,
  read_at = excluded.read_at,
  updated_at = excluded.updated_at,
  dirty = 1
`;

/** 절 읽음/해제 (멱등, soft-delete) */
export function setVerseRead(driver: SqliteDriver, input: SetVerseInput): void {
  const { userId, cycle, bookOrder, chapter, verse, read, now } = input;
  driver.run(VERSE_UPSERT_SQL, [
    verseKey(userId, cycle, bookOrder, chapter, verse),
    userId,
    cycle,
    bookOrder,
    chapter,
    verse,
    read ? 1 : 0,
    read ? now : null,
    now,
  ]);
}

/** 한 장에서 읽은 절 번호 목록 (현재 회차) */
export function getReadVerses(
  driver: SqliteDriver,
  userId: string,
  cycle: number,
  bookOrder: number,
  chapter: number,
): number[] {
  return driver
    .all<{ verse: number }>(
      'SELECT verse FROM verse_log WHERE user_id = ? AND cycle = ? AND book_order = ? AND chapter = ? AND read = 1 ORDER BY verse',
      [userId, cycle, bookOrder, chapter],
    )
    .map((r) => r.verse);
}

/** 한 장에서 읽은 절 수 */
export function countVerseReads(
  driver: SqliteDriver,
  userId: string,
  cycle: number,
  bookOrder: number,
  chapter: number,
): number {
  const row = driver.get<{ n: number }>(
    'SELECT COUNT(*) AS n FROM verse_log WHERE user_id = ? AND cycle = ? AND book_order = ? AND chapter = ? AND read = 1',
    [userId, cycle, bookOrder, chapter],
  );
  return row?.n ?? 0;
}

// ---- 회차 상태 (reading_cycle) ----

export interface CycleState {
  currentCycle: number;
  completedCycles: number;
}

export function getCycleState(driver: SqliteDriver, userId: string): CycleState {
  const row = driver.get<{ current_cycle: number; completed_cycles: number }>(
    'SELECT current_cycle, completed_cycles FROM reading_cycle WHERE user_id = ?',
    [userId],
  );
  return row
    ? { currentCycle: row.current_cycle, completedCycles: row.completed_cycles }
    : { currentCycle: 1, completedCycles: 0 };
}

export function upsertCycleState(
  driver: SqliteDriver,
  userId: string,
  state: CycleState,
  now: string,
): void {
  driver.run(
    `INSERT INTO reading_cycle (user_id, current_cycle, completed_cycles, updated_at, dirty)
     VALUES (?, ?, ?, ?, 1)
     ON CONFLICT (user_id) DO UPDATE SET
       current_cycle = excluded.current_cycle,
       completed_cycles = excluded.completed_cycles,
       updated_at = excluded.updated_at,
       dirty = 1`,
    [userId, state.currentCycle, state.completedCycles, now],
  );
}

// ---- 본문 캐시 (verse_cache) ----

export interface VerseText {
  verse: number;
  text: string;
}

export function getCachedChapter(
  driver: SqliteDriver,
  version: string,
  bookOrder: number,
  chapter: number,
): VerseText[] {
  return driver.all<VerseText>(
    'SELECT verse, text FROM verse_cache WHERE version = ? AND book_order = ? AND chapter = ? ORDER BY verse',
    [version, bookOrder, chapter],
  );
}

/** 본문 캐시 전체 삭제 (정리 로직 변경 등으로 무효화 시) */
export function clearVerseCache(driver: SqliteDriver): void {
  driver.run('DELETE FROM verse_cache');
}

export function cacheChapter(
  driver: SqliteDriver,
  version: string,
  bookOrder: number,
  chapter: number,
  verses: VerseText[],
): void {
  for (const v of verses) {
    driver.run(
      'INSERT OR REPLACE INTO verse_cache (version, book_order, chapter, verse, text) VALUES (?, ?, ?, ?, ?)',
      [version, bookOrder, chapter, v.verse, v.text],
    );
  }
}

// ---- 게스트 → 계정 데이터 이관 ----

/**
 * fromUser(예: 'local')의 기록을 toUser(로그인 uid)로 이관.
 * 충돌(이미 toUser에 같은 키 존재) 시 toUser 것을 유지(UPDATE OR IGNORE), 남은 fromUser 행은 삭제.
 * 이관된 행은 dirty=1로 표시되어 다음 동기화에 업로드된다.
 */
export function reassignUser(driver: SqliteDriver, fromUser: string, toUser: string): void {
  for (const table of ['reading_log', 'verse_log', 'reading_cycle']) {
    driver.run(`UPDATE OR IGNORE ${table} SET user_id = ?, dirty = 1 WHERE user_id = ?`, [toUser, fromUser]);
    driver.run(`DELETE FROM ${table} WHERE user_id = ?`, [fromUser]);
  }
}

// ---- 동기화 메타 ----

export function getLastSynced(driver: SqliteDriver, entity: string): string | null {
  const row = driver.get<{ last_synced_at: string | null }>(
    'SELECT last_synced_at FROM sync_meta WHERE entity = ?',
    [entity],
  );
  return row?.last_synced_at ?? null;
}

export function setLastSynced(driver: SqliteDriver, entity: string, iso: string): void {
  driver.run(
    `INSERT INTO sync_meta (entity, last_synced_at) VALUES (?, ?)
     ON CONFLICT (entity) DO UPDATE SET last_synced_at = excluded.last_synced_at`,
    [entity, iso],
  );
}

// ---- Pull 머지 (last-write-wins + dirty 보호 + 타이브레이커, 설계 §2.3) ----

export interface RemoteReadingLog {
  userId: string;
  cycle: number;
  bookOrder: number;
  chapter: number;
  read: boolean;
  readAt: string | null;
  updatedAt: string;
  source?: string;
}

export type MergeResult = 'inserted' | 'updated' | 'skipped';

/**
 * 서버 행을 로컬에 머지.
 * - 로컬 없음 → 삽입(dirty=0)
 * - 로컬 dirty=1 → 보호(스킵): 로컬 미전송 변경을 먼저 push해야 함
 * - 로컬 dirty=0 → updated_at이 더 최신이면 적용. 동률이면 read=true 우선(H-1 타이브레이커)
 */
export function mergeRemoteReadingLog(driver: SqliteDriver, remote: RemoteReadingLog): MergeResult {
  const local = driver.get<ReadingLogRow>(
    'SELECT * FROM reading_log WHERE user_id = ? AND cycle = ? AND book_order = ? AND chapter = ?',
    [remote.userId, remote.cycle, remote.bookOrder, remote.chapter],
  );

  const apply = (): void => {
    driver.run(
      `INSERT INTO reading_log (id, user_id, cycle, book_order, chapter, read, read_at, source, updated_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
       ON CONFLICT (user_id, cycle, book_order, chapter) DO UPDATE SET
         read = excluded.read, read_at = excluded.read_at, source = excluded.source,
         updated_at = excluded.updated_at, dirty = 0`,
      [
        naturalKey(remote.userId, remote.cycle, remote.bookOrder, remote.chapter),
        remote.userId,
        remote.cycle,
        remote.bookOrder,
        remote.chapter,
        remote.read ? 1 : 0,
        remote.readAt,
        remote.source ?? 'manual',
        remote.updatedAt,
      ],
    );
  };

  if (!local) {
    apply();
    return 'inserted';
  }
  if (local.dirty === 1) return 'skipped'; // 로컬 미전송 변경 보호

  if (remote.updatedAt > local.updated_at) {
    apply();
    return 'updated';
  }
  if (remote.updatedAt === local.updated_at) {
    // 타이브레이커: read=true 우선
    const remoteRead = remote.read ? 1 : 0;
    if (remoteRead === 1 && local.read === 0) {
      apply();
      return 'updated';
    }
  }
  return 'skipped';
}
