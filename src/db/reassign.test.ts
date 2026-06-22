import { SqliteDriver } from './driver';
import { initSchema } from './schema';
import { createNodeSqliteDriver } from './testing/nodeSqliteDriver';
import {
  getReadingEntries,
  markReadingLogsSynced,
  reassignUser,
  setChapterRead,
} from './readingRepo';

let driver: SqliteDriver & { close(): void };
beforeEach(() => {
  driver = createNodeSqliteDriver();
  initSchema(driver);
});
afterEach(() => driver.close());

describe('reassignUser (게스트 → 계정 이관)', () => {
  it('moves local rows to the new user and marks them dirty', () => {
    setChapterRead(driver, { userId: 'local', cycle: 1, bookOrder: 1, chapter: 1, read: true, now: 'T1' });
    setChapterRead(driver, { userId: 'local', cycle: 1, bookOrder: 1, chapter: 2, read: true, now: 'T1' });
    markReadingLogsSynced(driver, []); // no-op

    reassignUser(driver, 'local', 'uid-123');

    expect(getReadingEntries(driver, 'local')).toHaveLength(0);
    const moved = getReadingEntries(driver, 'uid-123');
    expect(moved).toHaveLength(2);
    const dirty = driver.all<{ n: number }>(
      'SELECT COUNT(*) AS n FROM reading_log WHERE user_id = ? AND dirty = 1',
      ['uid-123'],
    );
    expect(dirty[0]!.n).toBe(2);
  });

  it('on conflict keeps the existing account row and drops the local one', () => {
    // account already has Genesis 1 read
    setChapterRead(driver, { userId: 'uid-123', cycle: 1, bookOrder: 1, chapter: 1, read: true, now: 'ACCT' });
    // guest also touched Genesis 1 (unread) + Genesis 2
    setChapterRead(driver, { userId: 'local', cycle: 1, bookOrder: 1, chapter: 1, read: false, now: 'GUEST' });
    setChapterRead(driver, { userId: 'local', cycle: 1, bookOrder: 1, chapter: 2, read: true, now: 'GUEST' });

    reassignUser(driver, 'local', 'uid-123');

    expect(getReadingEntries(driver, 'local')).toHaveLength(0);
    const acct = getReadingEntries(driver, 'uid-123');
    expect(acct).toHaveLength(2); // Gen1 (kept account) + Gen2 (moved)
    const gen1 = acct.find((e) => e.chapter === 1)!;
    expect(gen1.read).toBe(true); // account's value preserved, not overwritten by guest
  });
});
