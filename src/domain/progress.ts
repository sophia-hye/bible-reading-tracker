// 진행률 계산 — 순수 함수 (Domain).
// 모든 진행률은 "현재 회차(current cycle)" 기준 (DM-6: cycle 미필터 시 100% 초과 버그).

import { LAST_OT_ORDER, ReadingLogEntry, TOTAL_CHAPTERS } from '../types/bible';
import { chapterKey } from './chapterKey';

export interface ProgressSummary {
  total: number;
  read: number;
  otRead: number;
  ntRead: number;
  /** 0..1 */
  percent: number;
}

function readKeysForCycle(entries: ReadingLogEntry[], cycle: number): Map<string, number> {
  // key -> bookOrder (read=true, 해당 cycle, 중복 제거)
  const map = new Map<string, number>();
  for (const e of entries) {
    if (e.cycle === cycle && e.read) {
      map.set(chapterKey(e.bookOrder, e.chapter), e.bookOrder);
    }
  }
  return map;
}

/** 현재 회차 기준 전체/구약/신약 진행률 */
export function progressSummary(entries: ReadingLogEntry[], cycle: number): ProgressSummary {
  const keys = readKeysForCycle(entries, cycle);
  let otRead = 0;
  let ntRead = 0;
  for (const bookOrder of keys.values()) {
    if (bookOrder <= LAST_OT_ORDER) otRead++;
    else ntRead++;
  }
  const read = keys.size;
  return {
    total: TOTAL_CHAPTERS,
    read,
    otRead,
    ntRead,
    percent: read / TOTAL_CHAPTERS,
  };
}

export interface BookProgress {
  bookOrder: number;
  read: number;
  total: number;
  percent: number;
}

/** 특정 책의 현재 회차 진행률 */
export function bookProgress(
  entries: ReadingLogEntry[],
  cycle: number,
  bookOrder: number,
  chapterCount: number,
): BookProgress {
  const keys = readKeysForCycle(entries, cycle);
  let read = 0;
  for (const bo of keys.values()) if (bo === bookOrder) read++;
  return {
    bookOrder,
    read,
    total: chapterCount,
    percent: chapterCount === 0 ? 0 : read / chapterCount,
  };
}
