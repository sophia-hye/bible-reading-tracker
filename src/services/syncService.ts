// 동기화 서비스 (Application). 오프라인 우선: 로컬을 먼저 push(미전송 보호),
// 그다음 pull로 서버 변경을 머지(last-write-wins). 설계 §2.3.

import { completedCycles } from '../domain/cycle';
import { SqliteDriver } from '../db/driver';
import {
  getDirtyReadingRows,
  getLastSynced,
  getReadingEntries,
  markReadingLogsSynced,
  mergeRemoteReadingLog,
  MergeResult,
  setLastSynced,
  upsertCycleState,
} from '../db/readingRepo';
import { RemoteApi } from './remote';

const READING_LOG = 'reading_log';

/** 로컬 dirty 행을 서버로 전송하고 동기화 완료 표시. 전송한 행 수 반환. */
export async function pushDirty(
  driver: SqliteDriver,
  remote: RemoteApi,
  userId: string,
): Promise<number> {
  const rows = getDirtyReadingRows(driver, userId);
  if (rows.length === 0) return 0;
  await remote.pushReadingLogs(rows.map(({ id: _id, ...r }) => r));
  markReadingLogsSynced(driver, rows.map((r) => r.id));
  return rows.length;
}

export interface PullResult {
  pulled: number;
  inserted: number;
  updated: number;
  skipped: number;
}

/** 서버 변경(since 이후)을 pull해 로컬에 머지하고 동기화 커서 전진. */
export async function pull(
  driver: SqliteDriver,
  remote: RemoteApi,
  userId: string,
): Promise<PullResult> {
  const since = getLastSynced(driver, READING_LOG);
  const rows = await remote.pullReadingLogs(userId, since);

  const tally: Record<MergeResult, number> = { inserted: 0, updated: 0, skipped: 0 };
  let maxUpdatedAt = since;
  for (const r of rows) {
    tally[mergeRemoteReadingLog(driver, r)] += 1;
    if (maxUpdatedAt === null || r.updatedAt > maxUpdatedAt) maxUpdatedAt = r.updatedAt;
  }
  if (maxUpdatedAt !== null) setLastSynced(driver, READING_LOG, maxUpdatedAt);

  return { pulled: rows.length, ...tally };
}

/**
 * 회독 상태 재계산·저장 (도메인 기준). 완독 회차 = 1,189장 채운 회차 수, 현재 = 완독 + 1.
 */
export function recomputeCycleState(driver: SqliteDriver, userId: string, now: string): void {
  const entries = getReadingEntries(driver, userId);
  const completed = completedCycles(entries);
  upsertCycleState(driver, userId, { currentCycle: completed + 1, completedCycles: completed }, now);
}

export interface SyncResult {
  pushed: number;
  pull: PullResult;
}

/** 전체 동기화: push(로컬 우선) → pull(머지) → 회차 재계산. */
export async function sync(
  driver: SqliteDriver,
  remote: RemoteApi,
  userId: string,
  now: string,
): Promise<SyncResult> {
  const pushed = await pushDirty(driver, remote, userId);
  const pullResult = await pull(driver, remote, userId);
  recomputeCycleState(driver, userId, now);
  return { pushed, pull: pullResult };
}
