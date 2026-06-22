import { SqliteDriver } from '../db/driver';
import { initSchema } from '../db/schema';
import { createNodeSqliteDriver } from '../db/testing/nodeSqliteDriver';
import {
  getCycleState,
  getDirtyReadingLogs,
  getReadingEntries,
  setChapterRead,
} from '../db/readingRepo';
import { createFakeRemote } from './testing/fakeRemote';
import { pull, pushDirty, recomputeCycleState, sync } from './syncService';
import { BIBLE_BOOKS } from '../data/bibleData';

const U = 'user-1';

function newDevice(): SqliteDriver & { close(): void } {
  const d = createNodeSqliteDriver();
  initSchema(d);
  return d;
}

describe('pushDirty', () => {
  it('sends dirty rows and clears the dirty flag', async () => {
    const d = newDevice();
    const remote = createFakeRemote();
    setChapterRead(d, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, read: true, now: 'T1' });
    setChapterRead(d, { userId: U, cycle: 1, bookOrder: 1, chapter: 2, read: true, now: 'T1' });

    expect(await pushDirty(d, remote, U)).toBe(2);
    expect(getDirtyReadingLogs(d, U)).toHaveLength(0);
    expect(remote.rows()).toHaveLength(2);
    expect(await pushDirty(d, remote, U)).toBe(0); // nothing left to push
    d.close();
  });
});

describe('multi-device round-trip', () => {
  it('device B pulls what device A pushed', async () => {
    const remote = createFakeRemote();
    const a = newDevice();
    const b = newDevice();

    setChapterRead(a, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, read: true, now: 'T1' });
    await pushDirty(a, remote, U);

    const res = await pull(b, remote, U);
    expect(res.pulled).toBe(1);
    expect(res.inserted).toBe(1);
    expect(getReadingEntries(b, U)).toHaveLength(1);
    expect(getReadingEntries(b, U)[0]!.read).toBe(true);

    a.close();
    b.close();
  });

  it('advances the sync cursor so a second pull gets nothing new', async () => {
    const remote = createFakeRemote();
    const a = newDevice();
    const b = newDevice();
    setChapterRead(a, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, read: true, now: '2026-06-20T01:00:00Z' });
    await pushDirty(a, remote, U);

    expect((await pull(b, remote, U)).pulled).toBe(1);
    expect((await pull(b, remote, U)).pulled).toBe(0);

    a.close();
    b.close();
  });

  it('protects local unsynced (dirty) edits during pull', async () => {
    const remote = createFakeRemote();
    const a = newDevice();
    // remote already has chapter read=true from another device
    remote.seed([
      { userId: U, cycle: 1, bookOrder: 1, chapter: 1, read: true, readAt: 'R', updatedAt: '2026-06-20T05:00:00Z' },
    ]);
    // local device A just unchecked it (dirty), newer is irrelevant — dirty must win
    setChapterRead(a, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, read: false, now: '2026-06-20T01:00:00Z' });

    const res = await pull(a, remote, U);
    expect(res.skipped).toBe(1);
    expect(getReadingEntries(a, U)[0]!.read).toBe(false); // local edit preserved
    a.close();
  });
});

describe('sync (push then pull then recompute)', () => {
  it('round-trips and recomputes cycle state', async () => {
    const remote = createFakeRemote();
    const a = newDevice();
    setChapterRead(a, { userId: U, cycle: 1, bookOrder: 1, chapter: 1, read: true, now: 'T1' });

    const result = await sync(a, remote, U, 'T2');
    expect(result.pushed).toBe(1);
    expect(getCycleState(a, U)).toEqual({ currentCycle: 1, completedCycles: 0 });
    a.close();
  });
});

describe('recomputeCycleState — full cycle advances to next', () => {
  it('marks 1 completed cycle and current cycle 2 after reading all 1189 chapters', () => {
    const d = newDevice();
    for (const book of BIBLE_BOOKS) {
      for (let ch = 1; ch <= book.chapterCount; ch++) {
        setChapterRead(d, { userId: U, cycle: 1, bookOrder: book.order, chapter: ch, read: true, now: 'T1' });
      }
    }
    recomputeCycleState(d, U, 'T2');
    expect(getCycleState(d, U)).toEqual({ currentCycle: 2, completedCycles: 1 });
    d.close();
  });
});
