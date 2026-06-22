// 연속 읽기(streak) 계산 — 순수 함수 (Domain).
// 입력은 'YYYY-MM-DD' 날짜 문자열들. today 기준 연속일 수.

function prevDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * 오늘(또는 어제)부터 거꾸로 연속해서 읽은 날 수.
 * 오늘 아직 안 읽었어도 어제까지 이어졌으면 그 streak를 유지(끊기지 않음).
 */
export function currentStreak(dates: string[], today: string): number {
  const set = new Set(dates);
  let cursor = today;
  if (!set.has(cursor)) cursor = prevDay(cursor);
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = prevDay(cursor);
  }
  return streak;
}
