// 본문 로딩 (Application) — bolls.life 공개 API에서 가져와 SQLite에 캐시.
// 캐시가 있으면 오프라인에서도 열람 가능. 동기화 대상 아님(로컬 전용).

import { cacheChapter, getCachedChapter, VerseText } from '../src/db/readingRepo';
import { getDriver } from './db/database';

// KJV 본문 정리: Strong's 번호(<S>7225</S>)는 태그+내용 통째 제거, 나머지 태그는 제거(내용 유지)
function cleanVerse(t: string): string {
  return t
    .replace(/<S>.*?<\/S>/gi, '') // Strong's 번호 제거 (숫자까지)
    .replace(/<[^>]+>/g, '') // 그 외 태그 제거
    .replace(/\s+/g, ' ')
    .trim();
}

export type Translation = 'KRV' | 'KJV';

export const TRANSLATIONS: { id: Translation; label: string }[] = [
  { id: 'KRV', label: '개역한글' },
  { id: 'KJV', label: 'KJV' },
];

interface BollsVerse {
  verse: number;
  text: string;
}

/** 한 장의 본문 로드: 캐시 우선, 없으면 API에서 가져와 캐시 */
export async function loadChapterText(
  version: Translation,
  bookOrder: number,
  chapter: number,
): Promise<VerseText[]> {
  const driver = getDriver();
  const cached = getCachedChapter(driver, version, bookOrder, chapter);
  if (cached.length > 0) return cached;

  const res = await fetch(`https://bolls.life/get-text/${version}/${bookOrder}/${chapter}/`);
  if (!res.ok) throw new Error('본문을 불러오지 못했습니다.');
  const data = (await res.json()) as BollsVerse[];
  const verses: VerseText[] = data.map((d) => ({
    verse: d.verse,
    text: cleanVerse(d.text),
  }));
  cacheChapter(driver, version, bookOrder, chapter, verses);
  return verses;
}

/** 캐시에 이미 있는지 (오프라인 가능 여부 판단용) */
export function hasCachedChapter(version: Translation, bookOrder: number, chapter: number): boolean {
  return getCachedChapter(getDriver(), version, bookOrder, chapter).length > 0;
}
