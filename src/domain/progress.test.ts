import { bookProgress, progressSummary } from './progress';
import { ReadingLogEntry, TOTAL_CHAPTERS } from '../types/bible';

const entry = (bookOrder: number, chapter: number, cycle = 1, read = true): ReadingLogEntry => ({
  bookOrder,
  chapter,
  cycle,
  read,
});

describe('progressSummary (현재 회차 기준)', () => {
  it('counts distinct read chapters and OT/NT split', () => {
    const entries = [entry(1, 1), entry(1, 2), entry(40, 1)]; // 2 OT + 1 NT
    const p = progressSummary(entries, 1);
    expect(p.total).toBe(TOTAL_CHAPTERS);
    expect(p.read).toBe(3);
    expect(p.otRead).toBe(2);
    expect(p.ntRead).toBe(1);
    expect(p.percent).toBeCloseTo(3 / TOTAL_CHAPTERS);
  });

  it('ignores entries from other cycles (DM-6)', () => {
    const entries = [entry(1, 1, 1), entry(1, 2, 2), entry(1, 3, 2)];
    expect(progressSummary(entries, 1).read).toBe(1);
    expect(progressSummary(entries, 2).read).toBe(2);
  });

  it('dedupes repeated chapter and excludes read=false', () => {
    const entries = [entry(1, 1), entry(1, 1), entry(1, 2, 1, false)];
    expect(progressSummary(entries, 1).read).toBe(1);
  });

  it('never exceeds 100% even with many cycles present', () => {
    const entries: ReadingLogEntry[] = [];
    for (let c = 1; c <= 3; c++) entries.push(entry(1, 1, c));
    expect(progressSummary(entries, 1).percent).toBeLessThanOrEqual(1);
  });
});

describe('bookProgress', () => {
  it('computes per-book read/total/percent for the cycle', () => {
    const entries = [entry(1, 1), entry(1, 2), entry(2, 1)];
    const bp = bookProgress(entries, 1, 1, 50); // Genesis 50 chapters
    expect(bp.read).toBe(2);
    expect(bp.total).toBe(50);
    expect(bp.percent).toBeCloseTo(2 / 50);
  });
});
