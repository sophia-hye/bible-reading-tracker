// 원격 API 추상화 (Application). Supabase 직접 호출을 이 인터페이스 뒤로 숨겨
// 동기화 로직을 백엔드 비종속·테스트 가능하게 한다(가짜 서버로 단위 테스트).

import { RemoteReadingLog } from '../db/readingRepo';

export interface RemoteApi {
  /** 로컬 변경을 서버로 업서트(서버도 멱등·LWW) */
  pushReadingLogs(rows: RemoteReadingLog[]): Promise<void>;
  /** since(ISO, null=전체) 이후 변경된 서버 행을 조회 */
  pullReadingLogs(userId: string, since: string | null): Promise<RemoteReadingLog[]>;
}
