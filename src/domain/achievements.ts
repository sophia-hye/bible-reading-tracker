// 성취/배지 — 순수 함수 (Domain). 현재 상태로부터 획득 배지를 계산.

export interface BadgeDef {
  key: string;
  name: string;
  desc: string;
}

export const BADGES: BadgeDef[] = [
  { key: 'first_step', name: '첫 걸음', desc: '첫 1장 읽기' },
  { key: 'first_book', name: '첫 책 완독', desc: '한 권 전체 완독' },
  { key: 'week_streak', name: '한 주 완주', desc: '7일 연속 읽기' },
  { key: 'month_streak', name: '꾸준함의 달인', desc: '30일 연속 읽기' },
  { key: 'pentateuch', name: '오경 정복', desc: '창세기~신명기 완독' },
  { key: 'gospels', name: '복음서 통과', desc: '4복음서 완독' },
  { key: 'ot_done', name: '구약 완독', desc: '구약 39권 완독' },
  { key: 'nt_done', name: '신약 완독', desc: '신약 27권 완독' },
  { key: 'cycle_1', name: '통독 완성', desc: '성경 1독 완료' },
  { key: 'cycle_3', name: '3독의 결심', desc: '성경 3독 완료' },
  { key: 'cycle_7', name: '7독 순례자', desc: '성경 7독 완료' },
  { key: 'cycle_10', name: '10독 마스터', desc: '성경 10독 완료' },
];

export interface BadgeInput {
  readCount: number; // 현재 회차 읽은 장
  streak: number;
  completedBooks: number;
  pentateuchDone: boolean;
  gospelsDone: boolean;
  otDone: boolean;
  ntDone: boolean;
  completedCycles: number;
}

export function earnedBadges(input: BadgeInput): Set<string> {
  const s = new Set<string>();
  if (input.readCount >= 1) s.add('first_step');
  if (input.completedBooks >= 1) s.add('first_book');
  if (input.streak >= 7) s.add('week_streak');
  if (input.streak >= 30) s.add('month_streak');
  if (input.pentateuchDone) s.add('pentateuch');
  if (input.gospelsDone) s.add('gospels');
  if (input.otDone) s.add('ot_done');
  if (input.ntDone) s.add('nt_done');
  if (input.completedCycles >= 1) s.add('cycle_1');
  if (input.completedCycles >= 3) s.add('cycle_3');
  if (input.completedCycles >= 7) s.add('cycle_7');
  if (input.completedCycles >= 10) s.add('cycle_10');
  return s;
}
