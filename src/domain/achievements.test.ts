import { BADGES, BadgeInput, earnedBadges } from './achievements';

const base: BadgeInput = {
  readCount: 0,
  streak: 0,
  completedBooks: 0,
  pentateuchDone: false,
  gospelsDone: false,
  otDone: false,
  ntDone: false,
  completedCycles: 0,
};

describe('earnedBadges', () => {
  it('fresh state earns nothing', () => {
    expect(earnedBadges(base).size).toBe(0);
  });

  it('first chapter earns first_step', () => {
    expect(earnedBadges({ ...base, readCount: 1 }).has('first_step')).toBe(true);
  });

  it('streak thresholds', () => {
    expect(earnedBadges({ ...base, streak: 7 }).has('week_streak')).toBe(true);
    expect(earnedBadges({ ...base, streak: 7 }).has('month_streak')).toBe(false);
    expect(earnedBadges({ ...base, streak: 30 }).has('month_streak')).toBe(true);
  });

  it('cycle ladder badges are cumulative', () => {
    const s = earnedBadges({ ...base, completedCycles: 7 });
    expect(s.has('cycle_1')).toBe(true);
    expect(s.has('cycle_3')).toBe(true);
    expect(s.has('cycle_7')).toBe(true);
    expect(s.has('cycle_10')).toBe(false);
  });

  it('genre/testament completion', () => {
    const s = earnedBadges({ ...base, pentateuchDone: true, otDone: true });
    expect(s.has('pentateuch')).toBe(true);
    expect(s.has('ot_done')).toBe(true);
  });

  it('all badge keys are defined in BADGES', () => {
    const all = earnedBadges({
      readCount: 1,
      streak: 30,
      completedBooks: 1,
      pentateuchDone: true,
      gospelsDone: true,
      otDone: true,
      ntDone: true,
      completedCycles: 10,
    });
    const defined = new Set(BADGES.map((b) => b.key));
    for (const k of all) expect(defined.has(k)).toBe(true);
    expect(all.size).toBe(BADGES.length);
  });
});
