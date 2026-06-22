// SQLite 드라이버 추상화 (Infrastructure).
// 동일 인터페이스로 테스트(node:sqlite)와 프로덕션(expo-sqlite)을 교체한다.
// 모든 쿼리는 파라미터 바인딩(?)을 사용 — 문자열 보간 금지(인젝션 방지).

export type SqlValue = string | number | null;

export interface SqliteDriver {
  /** 다중 문장(DDL) 실행 */
  exec(sql: string): void;
  /** 단일 쓰기 문장 */
  run(sql: string, params?: SqlValue[]): void;
  /** 여러 행 조회 */
  all<T>(sql: string, params?: SqlValue[]): T[];
  /** 단일 행 조회 (없으면 undefined) */
  get<T>(sql: string, params?: SqlValue[]): T | undefined;
}
