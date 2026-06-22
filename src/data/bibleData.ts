// Static Bible data adapter (Infrastructure→Domain bridge).
// Normalizes two bundled datasets onto a single canonical key (order 1..66)
// and validates their integrity at load time. See design §3.2.1.

import { BibleBook, Testament, TOTAL_BOOKS, TOTAL_CHAPTERS, TOTAL_VERSES } from '../types/bible';
import verseCounts from './verse-counts.json';
import verseLengthSteps from './verse-length-steps.json';

interface RawBook {
  order: number;
  abbr: string;
  name_en: string;
  name_ko: string;
  testament: string;
  genre: string;
  chapterCount: number;
  totalVerses: number;
  verses: number[];
}

const rawBooks = verseCounts.books as RawBook[];
const stepsByKey = verseLengthSteps.books as Record<string, string>;

/**
 * verse-counts의 name_en을 verse-length-steps 키로 매핑.
 * 두 데이터셋의 책 이름은 정확히 일치한다(시편도 양쪽 "Psalms"). 정확 일치만 허용하고,
 * 불일치가 생기면 null을 반환해 무결성 검증(validateBibleData)에서 잡는다.
 */
export function resolveStepsKey(nameEn: string): string | null {
  return nameEn in stepsByKey ? nameEn : null;
}

/** 회차 길이단계 문자열(절별 0/1/2)을 order로 조회 */
export function getVerseStepsString(order: number): string {
  const raw = rawBooks.find((b) => b.order === order);
  if (!raw) throw new Error(`Unknown book order: ${order}`);
  const key = resolveStepsKey(raw.name_en);
  if (key === null) throw new Error(`No verse-length-steps for ${raw.name_en}`);
  return stepsByKey[key]!;
}

/** 정규화된 66권 메타 (order 오름차순) */
export const BIBLE_BOOKS: BibleBook[] = rawBooks
  .map(
    (b): BibleBook => ({
      order: b.order,
      abbr: b.abbr,
      nameEn: b.name_en,
      nameKo: b.name_ko,
      testament: b.testament as Testament,
      genre: b.genre,
      chapterCount: b.chapterCount,
      totalVerses: b.totalVerses,
      verses: b.verses,
    }),
  )
  .sort((a, b) => a.order - b.order);

const BOOK_BY_ORDER = new Map<number, BibleBook>(BIBLE_BOOKS.map((b) => [b.order, b]));

export function getBook(order: number): BibleBook {
  const book = BOOK_BY_ORDER.get(order);
  if (!book) throw new Error(`Unknown book order: ${order}`);
  return book;
}

export interface IntegrityResult {
  ok: boolean;
  errors: string[];
}

/**
 * 정적 데이터 무결성 검증 (빌드/로드 게이트, 설계 §3.2.1).
 * ① 66권 ② 장합 1189 ③ verses.length===chapterCount
 * ④ steps 문자열 길이===totalVerses ⑤ 두 JSON 키 1:1 매칭(시편 정규화)
 * ⑥ 절합 31102
 */
export function validateBibleData(): IntegrityResult {
  const errors: string[] = [];

  if (BIBLE_BOOKS.length !== TOTAL_BOOKS) {
    errors.push(`book count ${BIBLE_BOOKS.length} !== ${TOTAL_BOOKS}`);
  }

  const chapterSum = BIBLE_BOOKS.reduce((s, b) => s + b.chapterCount, 0);
  if (chapterSum !== TOTAL_CHAPTERS) {
    errors.push(`chapter sum ${chapterSum} !== ${TOTAL_CHAPTERS}`);
  }

  let verseSum = 0;
  for (const b of BIBLE_BOOKS) {
    if (b.verses.length !== b.chapterCount) {
      errors.push(`${b.nameEn}: verses.length ${b.verses.length} !== chapterCount ${b.chapterCount}`);
    }
    const versesTotal = b.verses.reduce((s, v) => s + v, 0);
    if (versesTotal !== b.totalVerses) {
      errors.push(`${b.nameEn}: sum(verses) ${versesTotal} !== totalVerses ${b.totalVerses}`);
    }
    verseSum += b.totalVerses;

    const key = resolveStepsKey(b.nameEn);
    if (key === null) {
      errors.push(`${b.nameEn}: no matching verse-length-steps key`);
    } else if (stepsByKey[key]!.length !== b.totalVerses) {
      errors.push(`${b.nameEn}: steps length ${stepsByKey[key]!.length} !== totalVerses ${b.totalVerses}`);
    }
  }

  if (verseSum !== TOTAL_VERSES) {
    errors.push(`verse sum ${verseSum} !== ${TOTAL_VERSES}`);
  }

  // 역방향: steps 키 중 매칭되지 않는 것
  const matchedKeys = new Set(
    BIBLE_BOOKS.map((b) => resolveStepsKey(b.nameEn)).filter((k): k is string => k !== null),
  );
  for (const key of Object.keys(stepsByKey)) {
    if (!matchedKeys.has(key)) errors.push(`orphan verse-length-steps key: ${key}`);
  }

  return { ok: errors.length === 0, errors };
}
