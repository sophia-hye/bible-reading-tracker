// Domain types — pure, no external dependencies (Clean Architecture: Domain layer)

export type Testament = 'OT' | 'NT';

/** 점 크기 단계: 0=소, 1=중, 2=대 → 렌더에서 {r0,r1,r2} 반지름으로 매핑 */
export type SizeStep = 0 | 1 | 2;

/** 성경 한 권의 정적 메타데이터 (정규 키 = order 1..66) */
export interface BibleBook {
  order: number; // 1..66
  abbr: string; // "Gen"
  nameEn: string; // "Genesis"
  nameKo: string; // "창세기"
  testament: Testament;
  genre: string; // 오경/역사서/.../복음서/...
  chapterCount: number; // 50
  totalVerses: number; // 1533
  verses: number[]; // 장별 절 수, length === chapterCount
}

/** 한 장(chapter)의 읽음 기록 — 회독(cycle) 차원 포함 */
export interface ReadingLogEntry {
  bookOrder: number; // 1..66
  chapter: number; // 1-based
  cycle: number; // 회독 회차, 1-based
  read: boolean;
}

export const TOTAL_BOOKS = 66;
export const TOTAL_CHAPTERS = 1189;
export const TOTAL_VERSES = 31102;
/** 구약 = order 1..39, 신약 = order 40..66 */
export const LAST_OT_ORDER = 39;
