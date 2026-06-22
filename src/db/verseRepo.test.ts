import { SqliteDriver } from './driver';
import { initSchema } from './schema';
import { createNodeSqliteDriver } from './testing/nodeSqliteDriver';
import { countVerseReads, getReadVerses, setVerseRead, verseKey } from './readingRepo';

let driver: SqliteDriver & { close(): void };
const U = 'user-1';

beforeEach(() => {
  driver = createNodeSqliteDriver();
  initSchema(driver);
});
afterEach(() => driver.close());

describe('verse_log — verse-level tracking', () => {
  it('idempotent upsert: same verse twice → one row', () => {
    setVerseRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, verse: 1, read: true, now: 'T1' });
    setVerseRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, verse: 1, read: true, now: 'T2' });
    expect(countVerseReads(driver, U, 1, 1, 1)).toBe(1);
  });

  it('tracks multiple verses and returns them ordered', () => {
    setVerseRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, verse: 3, read: true, now: 'T1' });
    setVerseRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, verse: 1, read: true, now: 'T1' });
    setVerseRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, verse: 2, read: true, now: 'T1' });
    expect(getReadVerses(driver, U, 1, 1, 1)).toEqual([1, 2, 3]);
  });

  it('uncheck (soft-delete) removes from read set', () => {
    setVerseRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, verse: 1, read: true, now: 'T1' });
    setVerseRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, verse: 1, read: false, now: 'T2' });
    expect(getReadVerses(driver, U, 1, 1, 1)).toEqual([]);
    expect(countVerseReads(driver, U, 1, 1, 1)).toBe(0);
  });

  it('separates verses by chapter and cycle', () => {
    setVerseRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, verse: 1, read: true, now: 'T1' });
    setVerseRead(driver, { userId: U, cycle: 1, bookOrder: 1, chapter: 2, verse: 1, read: true, now: 'T1' });
    setVerseRead(driver, { userId: U, cycle: 2, bookOrder: 1, chapter: 1, verse: 1, read: true, now: 'T1' });
    expect(countVerseReads(driver, U, 1, 1, 1)).toBe(1);
    expect(countVerseReads(driver, U, 1, 1, 2)).toBe(1);
    expect(countVerseReads(driver, U, 2, 1, 1)).toBe(1);
  });

  it('verseKey is unique per (user,cycle,book,chapter,verse)', () => {
    expect(verseKey(U, 1, 1, 1, 1)).not.toBe(verseKey(U, 1, 1, 1, 2));
    expect(verseKey(U, 1, 1, 1, 1)).toBe('user-1:1:1:1:1');
  });
});
