import { recommendNext } from './recommend';
import { currentStreak } from './streak';
import { BIBLE_BOOKS } from '../data/bibleData';

describe('recommendNext (오늘 읽을 분량)', () => {
  it('fresh user → 창세기 1–3장', () => {
    const r = recommendNext(BIBLE_BOOKS, () => false, 3);
    expect(r).not.toBeNull();
    expect(r!.bookNameKo).toBe('창세기');
    expect(r!.startChapter).toBe(1);
    expect(r!.endChapter).toBe(3);
    expect(r!.count).toBe(3);
  });

  it('skips already-read chapters', () => {
    const read = new Set(['1:1', '1:2']);
    const r = recommendNext(BIBLE_BOOKS, (b, c) => read.has(`${b}:${c}`), 3);
    expect(r!.startChapter).toBe(3);
    expect(r!.endChapter).toBe(5);
  });

  it('does not span across books', () => {
    // Genesis(50장) 49,50만 안 읽음 → 49–50 (2장)에서 멈춤
    const r = recommendNext(
      BIBLE_BOOKS,
      (b, c) => !(b === 1 && (c === 49 || c === 50)),
      3,
    );
    expect(r!.bookOrder).toBe(1);
    expect(r!.startChapter).toBe(49);
    expect(r!.endChapter).toBe(50);
    expect(r!.count).toBe(2);
  });

  it('all read → null', () => {
    expect(recommendNext(BIBLE_BOOKS, () => true, 3)).toBeNull();
  });
});

describe('currentStreak', () => {
  it('counts consecutive days ending today', () => {
    expect(currentStreak(['2026-06-19', '2026-06-20', '2026-06-21'], '2026-06-21')).toBe(3);
  });

  it('continues from yesterday if today not yet read', () => {
    expect(currentStreak(['2026-06-19', '2026-06-20'], '2026-06-21')).toBe(2);
  });

  it('breaks on a gap', () => {
    expect(currentStreak(['2026-06-17', '2026-06-20', '2026-06-21'], '2026-06-21')).toBe(2);
  });

  it('zero when no recent reads', () => {
    expect(currentStreak(['2026-06-01'], '2026-06-21')).toBe(0);
  });
});
