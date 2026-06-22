import {
  chapterSizeStep,
  computeChapterSizeThresholds,
  verseSizeSteps,
} from './dotSize';
import { BIBLE_BOOKS, getBook, getVerseStepsString } from '../data/bibleData';

describe('chapter size (점 크기 = 장 길이, C-1)', () => {
  const thresholds = computeChapterSizeThresholds(BIBLE_BOOKS);

  it('produces ascending tertile thresholds', () => {
    expect(thresholds.t1).toBeGreaterThan(0);
    expect(thresholds.t2).toBeGreaterThanOrEqual(thresholds.t1);
  });

  it('maps small/medium/large deterministically', () => {
    expect(chapterSizeStep(thresholds.t1 - 1, thresholds)).toBe(0);
    expect(chapterSizeStep(thresholds.t1, thresholds)).toBe(1);
    expect(chapterSizeStep(thresholds.t2, thresholds)).toBe(2);
  });

  it('Psalms 119 (very long chapter) is large(2)', () => {
    const psalms = BIBLE_BOOKS.find((b) => b.nameEn === 'Psalms')!;
    const ch119 = psalms.verses[118]!; // 176 verses
    expect(chapterSizeStep(ch119, thresholds)).toBe(2);
  });
});

describe('verse size steps (절 그리드, 절별 단계)', () => {
  it('returns one step per verse of the chapter', () => {
    const gen = getBook(1);
    const steps = verseSizeSteps(getVerseStepsString(1), gen.verses, 1);
    expect(steps).toHaveLength(gen.verses[0]!); // Genesis 1 = 31 verses
    expect(steps.every((s) => s === 0 || s === 1 || s === 2)).toBe(true);
  });

  it('slices the correct offset for chapter 2', () => {
    const gen = getBook(1);
    const full = getVerseStepsString(1);
    const ch2 = verseSizeSteps(full, gen.verses, 2);
    expect(ch2).toHaveLength(gen.verses[1]!);
    // chapter 2 slice starts after chapter 1 verses
    const expectedFirst = Number(full[gen.verses[0]!]);
    expect(ch2[0]).toBe(expectedFirst);
  });

  it('throws on out-of-range chapter', () => {
    const gen = getBook(1);
    expect(() => verseSizeSteps(getVerseStepsString(1), gen.verses, 999)).toThrow();
  });
});
