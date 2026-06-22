// 점 크기(SizeStep) 파생 — 순수 함수 (Domain).
// 장 매트릭스: 점 크기 = 장 길이(절 수)  → verse-counts.verses[]에서 파생 (C-1)
// 절 그리드:   점 크기 = 절 글자수 단계  → verse-length-steps에서 파생

import { BibleBook, SizeStep } from '../types/bible';

export interface SizeThresholds {
  /** 이 값 미만 = 소(0) */
  t1: number;
  /** 이 값 미만 = 중(1), 이상 = 대(2) */
  t2: number;
}

/**
 * 전체 1,189장의 절 수 분포 3분위(tertile)로 장 점 크기 임계값을 계산.
 * 데이터가 고정이라 결과는 결정론적.
 */
export function computeChapterSizeThresholds(books: BibleBook[]): SizeThresholds {
  const counts = books.flatMap((b) => b.verses).sort((a, b) => a - b);
  const n = counts.length;
  if (n === 0) return { t1: 0, t2: 0 };
  const t1 = counts[Math.floor(n / 3)]!;
  const t2 = counts[Math.floor((2 * n) / 3)]!;
  return { t1, t2 };
}

/** 장 길이(절 수)를 SizeStep으로 매핑 */
export function chapterSizeStep(verseCount: number, thresholds: SizeThresholds): SizeStep {
  if (verseCount < thresholds.t1) return 0;
  if (verseCount < thresholds.t2) return 1;
  return 2;
}

/**
 * 한 장의 절별 SizeStep 배열.
 * stepsString은 책 전체(절 단위) 0/1/2 문자열이며, 해당 장의 구간을 잘라낸다.
 */
export function verseSizeSteps(
  stepsString: string,
  chapterVerseCounts: number[],
  chapter: number,
): SizeStep[] {
  if (chapter < 1 || chapter > chapterVerseCounts.length) {
    throw new Error(`chapter ${chapter} out of range`);
  }
  let offset = 0;
  for (let i = 0; i < chapter - 1; i++) offset += chapterVerseCounts[i]!;
  const len = chapterVerseCounts[chapter - 1]!;
  const slice = stepsString.slice(offset, offset + len);
  return slice.split('').map((c) => Number(c) as SizeStep);
}
