// 회독(N독) 도메인 — 순수 함수 (Domain). 설계 §3.5.
// 회차별 순차 트래킹 + 미션 사다리(고정+커스텀) + 누적 깊이(depth) 시각화.

import { ReadingLogEntry, TOTAL_CHAPTERS } from '../types/bible';
import { chapterKey } from './chapterKey';

/** 고정 미션 사다리 (회독 목표 회차) */
export const MISSION_LADDER: readonly number[] = [1, 3, 5, 7, 10, 15, 20, 30, 50, 100];

/** 회차별 read=true 장의 distinct 수 */
function readCountByCycle(entries: ReadingLogEntry[]): Map<number, Set<string>> {
  const byCycle = new Map<number, Set<string>>();
  for (const e of entries) {
    if (!e.read) continue;
    let set = byCycle.get(e.cycle);
    if (!set) {
      set = new Set<string>();
      byCycle.set(e.cycle, set);
    }
    set.add(chapterKey(e.bookOrder, e.chapter));
  }
  return byCycle;
}

/** 한 회차 완독 여부 (1,189장 모두) */
export function isCycleComplete(distinctReadInCycle: number): boolean {
  return distinctReadInCycle >= TOTAL_CHAPTERS;
}

/** 완독한 회차 수 = 1,189장을 모두 채운 회차의 개수 */
export function completedCycles(entries: ReadingLogEntry[]): number {
  let count = 0;
  for (const set of readCountByCycle(entries).values()) {
    if (isCycleComplete(set.size)) count++;
  }
  return count;
}

/** 현재 진행 중인 회차 = 완독 회차 + 1 */
export function currentCycle(entries: ReadingLogEntry[]): number {
  return completedCycles(entries) + 1;
}

/** 장별 누적 회독 깊이 = 그 장을 read한 distinct 회차 수 (전체 누적 시각화용) */
export function depthByChapter(entries: ReadingLogEntry[]): Map<string, number> {
  const cyclesByChapter = new Map<string, Set<number>>();
  for (const e of entries) {
    if (!e.read) continue;
    const k = chapterKey(e.bookOrder, e.chapter);
    let set = cyclesByChapter.get(k);
    if (!set) {
      set = new Set<number>();
      cyclesByChapter.set(k, set);
    }
    set.add(e.cycle);
  }
  const depth = new Map<string, number>();
  for (const [k, set] of cyclesByChapter) depth.set(k, set.size);
  return depth;
}

/**
 * 다음 미션 목표 회차.
 * 사다리와 커스텀 목표를 합쳐, 완독 회차보다 큰 것 중 가장 가까운 값.
 * 사다리를 모두 초과하면 null (커스텀이 없으면 더 이상 자동 목표 없음).
 */
export function nextMission(completed: number, customTargets: number[] = []): number | null {
  const candidates = [...MISSION_LADDER, ...customTargets]
    .filter((t) => t > completed)
    .sort((a, b) => a - b);
  return candidates.length > 0 ? candidates[0]! : null;
}

/**
 * 미션 미설정 시 기본 목표 회차 — 현재 회차보다 큰 첫 사다리 값.
 * 예: 1회독 중(cycle=1) → 3, 3독 완료 후(cycle=4) → 5. 사다리 초과 시 null.
 */
export function defaultMissionTarget(cycle: number): number | null {
  return MISSION_LADDER.find((v) => v > cycle) ?? null;
}

/**
 * 누적 깊이를 무채색 잉크 농도 단계(0..maxStep)로 매핑.
 * depth 0 = 미읽음(연회색), 1..maxObservedDepth를 maxStep 단계로 정규화.
 */
export function depthToInkStep(depth: number, maxObservedDepth: number, maxStep = 4): number {
  if (depth <= 0) return 0;
  if (maxObservedDepth <= 1) return maxStep;
  const ratio = Math.min(depth, maxObservedDepth) / maxObservedDepth;
  return Math.max(1, Math.round(ratio * maxStep));
}
