import { SqliteDriver } from './driver';
import { initSchema } from './schema';
import { createNodeSqliteDriver } from './testing/nodeSqliteDriver';
import {
  countReadInCycle,
  getCycleState,
  getDirtyReadingLogs,
  getLastSynced,
  getReadDates,
  getReadingEntries,
  markReadingLogsSynced,
  mergeRemoteReadingLog,
  naturalKey,
  setChapterRead,
  setLastSynced,
  upsertCycleState,
} from './readingRepo';

let driver: SqliteDriver & { close(): void };

beforeEach(() => {
  driver = createNodeSqliteDriver();
  initSchema(driver);
});

afterEach(() => {
  driver.close();
});

const U = 'user-1';

describe('setChapterRead — idempotent upsert', () => {
  it('checking the same chapter twice keeps a single row', () => {
    setChapterRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, read: true, now: '2026-06-20T00:00:00Z' });
    setChapterRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, read: true, now: '2026-06-20T01:00:00Z' });
    const entries = getReadingEntries(driver, U);
    expect(entries).toHaveLength(1);
    expect(countReadInCycle(driver, U, 1)).toBe(1);
  });

  it('uncheck is a soft-delete (read=false, read_at=null, row kept)', () => {
    setChapterRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, read: true, now: '2026-06-20T00:00:00Z' });
    setChapterRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, read: false, now: '2026-06-20T02:00:00Z' });
    const entries = getReadingEntries(driver, U);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.read).toBe(false);
    expect(countReadInCycle(driver, U, 1)).toBe(0);
    const row = driver.get<{ read_at: string | null }>(
      'SELECT read_at FROM reading_log WHERE id = ?',
      [naturalKey(U, 1, 1, 1)],
    );
    expect(row!.read_at).toBeNull();
  });

  it('separates the same chapter across cycles', () => {
    setChapterRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, read: true, now: '2026-06-20T00:00:00Z' });
    setChapterRead(driver, { userId: U, cycle: 2, bookOrder: 1, chapter: 1, read: true, now: '2026-06-20T00:00:00Z' });
    expect(getReadingEntries(driver, U)).toHaveLength(2);
    expect(countReadInCycle(driver, U, 1)).toBe(1);
    expect(countReadInCycle(driver, U, 2)).toBe(1);
  });
});

describe('dirty tracking & sync', () => {
  it('new writes are dirty; markSynced clears them', () => {
    setChapterRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, read: true, now: 'T1' });
    setChapterRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 2, read: true, now: 'T1' });
    expect(getDirtyReadingLogs(driver, U)).toHaveLength(2);
    markReadingLogsSynced(driver, [naturalKey(U, 1, 1, 1), naturalKey(U, 1, 1, 2)]);
    expect(getDirtyReadingLogs(driver, U)).toHaveLength(0);
  });
});

describe('getReadDates', () => {
  it('returns distinct read dates (YYYY-MM-DD) from read_at', () => {
    setChapterRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, read: true, now: '2026-06-20T08:00:00Z' });
    setChapterRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 2, read: true, now: '2026-06-20T09:00:00Z' });
    setChapterRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 3, read: true, now: '2026-06-21T07:00:00Z' });
    expect(getReadDates(driver, U)).toEqual(['2026-06-20', '2026-06-21']);
  });

  it('excludes unread (soft-deleted) chapters', () => {
    setChapterRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, read: true, now: '2026-06-20T08:00:00Z' });
    setChapterRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, read: false, now: '2026-06-21T08:00:00Z' });
    expect(getReadDates(driver, U)).toEqual([]);
  });
});

describe('cycle state', () => {
  it('defaults to cycle 1 / 0 completed', () => {
    expect(getCycleState(driver, U)).toEqual({ currentCycle: 1, completedCycles: 0 });
  });

  it('upserts current/completed cycles', () => {
    upsertCycleState(driver, U, { currentCycle: 3, completedCycles: 2 }, 'T1');
    expect(getCycleState(driver, U)).toEqual({ currentCycle: 3, completedCycles: 2 });
  });
});

describe('sync_meta', () => {
  it('stores and reads last-synced cursor', () => {
    expect(getLastSynced(driver, 'reading_log')).toBeNull();
    setLastSynced(driver, 'reading_log', '2026-06-20T00:00:00Z');
    expect(getLastSynced(driver, 'reading_log')).toBe('2026-06-20T00:00:00Z');
  });
});

describe('mergeRemoteReadingLog — last-write-wins + dirty protection (§2.3)', () => {
  const remote = (over: Partial<Parameters<typeof mergeRemoteReadingLog>[1]> = {}) => ({
    userId: U, cycle: 1, bookOrder: 1, chapter: 1, read: true, readAt: 'R', updatedAt: '2026-06-20T05:00:00Z', ...over,
  });

  it('inserts when no local row exists (dirty=0)', () => {
    expect(mergeRemoteReadingLog(driver, remote())).toBe('inserted');
    expect(getDirtyReadingLogs(driver, U)).toHaveLength(0);
  });

  it('protects local dirty rows (skips remote)', () => {
    setChapterRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, read: false, now: 'T1' });
    expect(mergeRemoteReadingLog(driver, remote())).toBe('skipped');
    expect(getReadingEntries(driver, U)[0]!.read).toBe(false);
  });

  it('applies a newer remote over a synced local row', () => {
    setChapterRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, read: false, now: '2026-06-20T00:00:00Z' });
    markReadingLogsSynced(driver, [naturalKey(U, 1, 1, 1)]);
    expect(mergeRemoteReadingLog(driver, remote({ read: true, updatedAt: '2026-06-20T06:00:00Z' }))).toBe('updated');
    expect(getReadingEntries(driver, U)[0]!.read).toBe(true);
  });

  it('keeps older remote out (skipped)', () => {
    setChapterRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, read: true, now: '2026-06-20T09:00:00Z' });
    markReadingLogsSynced(driver, [naturalKey(U, 1, 1, 1)]);
    expect(mergeRemoteReadingLog(driver, remote({ read: false, updatedAt: '2026-06-20T01:00:00Z' }))).toBe('skipped');
    expect(getReadingEntries(driver, U)[0]!.read).toBe(true);
  });

  it('tiebreaker: equal timestamp, read=true wins', () => {
    setChapterRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, read: false, now: '2026-06-20T05:00:00Z' });
    markReadingLogsSynced(driver, [naturalKey(U, 1, 1, 1)]);
    expect(mergeRemoteReadingLog(driver, remote({ read: true, updatedAt: '2026-06-20T05:00:00Z' }))).toBe('updated');
    expect(getReadingEntries(driver, U)[0]!.read).toBe(true);
  });
});
