import {
  completedCycles,
  currentCycle,
  defaultMissionTarget,
  depthByChapter,
  depthToInkStep,
  isCycleComplete,
  MISSION_LADDER,
  nextMission,
} from './cycle';
import { ReadingLogEntry, TOTAL_CHAPTERS } from '../types/bible';
import { BIBLE_BOOKS } from '../data/bibleData';
import { chapterKey } from './chapterKey';

/** 한 회차 전체(1,189장) read 엔트리 생성 */
function fullCycle(cycle: number): ReadingLogEntry[] {
  const entries: ReadingLogEntry[] = [];
  for (const b of BIBLE_BOOKS) {
    for (let ch = 1; ch <= b.chapterCount; ch++) {
      entries.push({ bookOrder: b.order, chapter: ch, cycle, read: true });
    }
  }
  return entries;
}

describe('cycle completion', () => {
  it('isCycleComplete needs all 1189 chapters', () => {
    expect(isCycleComplete(TOTAL_CHAPTERS)).toBe(true);
    expect(isCycleComplete(TOTAL_CHAPTERS - 1)).toBe(false);
  });

  it('counts completed cycles and derives current cycle', () => {
    const entries = [...fullCycle(1), ...fullCycle(2)];
    entries.push({ bookOrder: 1, chapter: 1, cycle: 3, read: true }); // partial cycle 3
    expect(completedCycles(entries)).toBe(2);
    expect(currentCycle(entries)).toBe(3);
  });

  it('a fresh user has 0 completed, current cycle 1', () => {
    expect(completedCycles([])).toBe(0);
    expect(currentCycle([])).toBe(1);
  });
});

describe('depth (누적 회독 깊이)', () => {
  it('counts distinct cycles a chapter was read', () => {
    const entries: ReadingLogEntry[] = [
      { bookOrder: 1, chapter: 1, cycle: 1, read: true },
      { bookOrder: 1, chapter: 1, cycle: 2, read: true },
      { bookOrder: 1, chapter: 2, cycle: 1, read: true },
    ];
    const depth = depthByChapter(entries);
    expect(depth.get(chapterKey(1, 1))).toBe(2);
    expect(depth.get(chapterKey(1, 2))).toBe(1);
  });

  it('depthToInkStep maps depth to ink steps', () => {
    expect(depthToInkStep(0, 5)).toBe(0);
    expect(depthToInkStep(5, 5)).toBe(4);
    expect(depthToInkStep(3, 6, 4)).toBeGreaterThan(0);
  });
});

describe('mission ladder (고정 + 커스텀)', () => {
  it('first mission is 1독', () => {
    expect(MISSION_LADDER[0]).toBe(1);
    expect(nextMission(0)).toBe(1);
  });

  it('after 1독 the next ladder goal is 3', () => {
    expect(nextMission(1)).toBe(3);
  });

  it('custom target can be closer than ladder', () => {
    expect(nextMission(1, [2])).toBe(2);
  });

  it('returns null when ladder exhausted and no custom target', () => {
    expect(nextMission(100)).toBeNull();
  });

  it('defaultMissionTarget: during 1독(cycle 1) → 3', () => {
    expect(defaultMissionTarget(1)).toBe(3);
    expect(defaultMissionTarget(3)).toBe(5);
    expect(defaultMissionTarget(4)).toBe(5);
    expect(defaultMissionTarget(100)).toBeNull();
  });
});
