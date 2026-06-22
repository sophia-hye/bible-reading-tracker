// 오늘 읽을 분량 추천 — 순수 함수 (Domain).
// 계획(plan) 미선택 시 기본 규칙: 정경 순서로 다음 미읽은 장부터 연속 N장.

import { BibleBook } from '../types/bible';

export interface NextReading {
  bookOrder: number;
  bookNameKo: string;
  bookNameEn: string;
  startChapter: number;
  endChapter: number;
  count: number;
}

/**
 * 현재 회독에서 아직 안 읽은 첫 장을 찾아, 같은 책 안에서 연속 최대 `count`장을 추천.
 * 모두 읽었으면 null.
 */
export function recommendNext(
  books: BibleBook[],
  isRead: (bookOrder: number, chapter: number) => boolean,
  count = 3,
): NextReading | null {
  for (const b of books) {
    for (let ch = 1; ch <= b.chapterCount; ch++) {
      if (!isRead(b.order, ch)) {
        let end = ch;
        while (end + 1 <= b.chapterCount && !isRead(b.order, end + 1) && end - ch + 1 < count) {
          end += 1;
        }
        return {
          bookOrder: b.order,
          bookNameKo: b.nameKo,
          bookNameEn: b.nameEn,
          startChapter: ch,
          endChapter: end,
          count: end - ch + 1,
        };
      }
    }
  }
  return null;
}
