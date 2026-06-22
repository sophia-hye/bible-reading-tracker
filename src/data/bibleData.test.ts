import {
  BIBLE_BOOKS,
  getBook,
  getVerseStepsString,
  resolveStepsKey,
  validateBibleData,
} from './bibleData';
import { TOTAL_BOOKS, TOTAL_CHAPTERS, TOTAL_VERSES } from '../types/bible';

describe('bibleData integrity (design §3.2.1)', () => {
  it('passes full integrity validation', () => {
    const result = validateBibleData();
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('has 66 books / 1189 chapters / 31102 verses', () => {
    expect(BIBLE_BOOKS).toHaveLength(TOTAL_BOOKS);
    expect(BIBLE_BOOKS.reduce((s, b) => s + b.chapterCount, 0)).toBe(TOTAL_CHAPTERS);
    expect(BIBLE_BOOKS.reduce((s, b) => s + b.totalVerses, 0)).toBe(TOTAL_VERSES);
  });

  it('every book verses[] length matches chapterCount', () => {
    for (const b of BIBLE_BOOKS) {
      expect(b.verses).toHaveLength(b.chapterCount);
    }
  });

  it('books are sorted by order 1..66', () => {
    expect(BIBLE_BOOKS.map((b) => b.order)).toEqual(
      Array.from({ length: TOTAL_BOOKS }, (_, i) => i + 1),
    );
  });

  it('splits OT(39)/NT(27)', () => {
    expect(BIBLE_BOOKS.filter((b) => b.testament === 'OT')).toHaveLength(39);
    expect(BIBLE_BOOKS.filter((b) => b.testament === 'NT')).toHaveLength(27);
  });
});

describe('key resolution (C-2 — datasets now consistent)', () => {
  it('Psalms matches exactly in both datasets', () => {
    expect(resolveStepsKey('Psalms')).toBe('Psalms');
    expect(BIBLE_BOOKS.find((b) => b.order === 19)!.nameEn).toBe('Psalms');
  });

  it('resolves an exact-match key', () => {
    expect(resolveStepsKey('Genesis')).toBe('Genesis');
  });

  it('returns null for unknown book', () => {
    expect(resolveStepsKey('Nonexistent')).toBeNull();
  });

  it('no book name is the singular "Psalm"', () => {
    expect(BIBLE_BOOKS.some((b) => b.nameEn === 'Psalm')).toBe(false);
  });
});

describe('verse-length steps are per-verse, not per-chapter (C-1)', () => {
  it('Genesis steps string length equals total verses (1533), not chapter count (50)', () => {
    const gen = getBook(1);
    expect(gen.nameEn).toBe('Genesis');
    expect(getVerseStepsString(1)).toHaveLength(gen.totalVerses);
    expect(getVerseStepsString(1).length).not.toBe(gen.chapterCount);
  });

  it('Obadiah (1 chapter, 21 verses) steps string length is 21', () => {
    const oba = BIBLE_BOOKS.find((b) => b.nameEn === 'Obadiah')!;
    expect(oba.chapterCount).toBe(1);
    expect(getVerseStepsString(oba.order)).toHaveLength(21);
  });

  it('steps string only contains 0/1/2', () => {
    for (const b of BIBLE_BOOKS) {
      expect(getVerseStepsString(b.order)).toMatch(/^[012]+$/);
    }
  });
});
