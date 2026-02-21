import { describe, it, expect } from 'vitest';
import { level1Cards, level2Cards, level3Cards, nobles } from '../gameData';
import { GemType } from '../../types/game';

const VALID_GEMS: Exclude<GemType, 'gold'>[] = ['diamond', 'sapphire', 'emerald', 'ruby', 'onyx'];

describe('Official Card Data', () => {
  it('has correct card counts (40 / 30 / 20)', () => {
    expect(level1Cards).toHaveLength(40);
    expect(level2Cards).toHaveLength(30);
    expect(level3Cards).toHaveLength(20);
  });

  it('all cards have correct level set', () => {
    for (const c of level1Cards) expect(c.level).toBe(1);
    for (const c of level2Cards) expect(c.level).toBe(2);
    for (const c of level3Cards) expect(c.level).toBe(3);
  });

  it('all cards have a valid gem type (non-gold)', () => {
    for (const c of [...level1Cards, ...level2Cards, ...level3Cards]) {
      expect(VALID_GEMS).toContain(c.gem);
    }
  });

  it('all card costs reference only valid non-gold gems', () => {
    for (const c of [...level1Cards, ...level2Cards, ...level3Cards]) {
      for (const gem of Object.keys(c.cost)) {
        expect(VALID_GEMS).toContain(gem);
      }
    }
  });

  it('all card costs are positive integers', () => {
    for (const c of [...level1Cards, ...level2Cards, ...level3Cards]) {
      for (const count of Object.values(c.cost)) {
        expect(count).toBeGreaterThan(0);
        expect(Number.isInteger(count)).toBe(true);
      }
    }
  });

  it('level 1 cards have 0-1 points', () => {
    for (const c of level1Cards) {
      expect(c.points).toBeGreaterThanOrEqual(0);
      expect(c.points).toBeLessThanOrEqual(1);
    }
  });

  it('level 2 cards have 1-3 points', () => {
    for (const c of level2Cards) {
      expect(c.points).toBeGreaterThanOrEqual(1);
      expect(c.points).toBeLessThanOrEqual(3);
    }
  });

  it('level 3 cards have 3-5 points', () => {
    for (const c of level3Cards) {
      expect(c.points).toBeGreaterThanOrEqual(3);
      expect(c.points).toBeLessThanOrEqual(5);
    }
  });

  it('each level has 8 cards per gem color for level 1', () => {
    for (const gem of VALID_GEMS) {
      expect(level1Cards.filter(c => c.gem === gem)).toHaveLength(8);
    }
  });

  it('each level has 6 cards per gem color for level 2', () => {
    for (const gem of VALID_GEMS) {
      expect(level2Cards.filter(c => c.gem === gem)).toHaveLength(6);
    }
  });

  it('each level has 4 cards per gem color for level 3', () => {
    for (const gem of VALID_GEMS) {
      expect(level3Cards.filter(c => c.gem === gem)).toHaveLength(4);
    }
  });
});

describe('Official Noble Data', () => {
  it('has exactly 10 nobles', () => {
    expect(nobles).toHaveLength(10);
  });

  it('all nobles are worth 3 points', () => {
    for (const n of nobles) {
      expect(n.points).toBe(3);
    }
  });

  it('nobles require either 2 gems at 4 each or 3 gems at 3 each', () => {
    for (const n of nobles) {
      const entries = Object.entries(n.requirements);
      const count = entries.length;
      expect([2, 3]).toContain(count);

      const expectedAmount = count === 2 ? 4 : 3;
      for (const [gem, amount] of entries) {
        expect(VALID_GEMS).toContain(gem);
        expect(amount).toBe(expectedAmount);
      }
    }
  });

  it('no duplicate nobles', () => {
    const keys = nobles.map(n =>
      Object.entries(n.requirements)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([gem, count]) => `${gem}:${count}`)
        .join(',')
    );
    expect(new Set(keys).size).toBe(nobles.length);
  });
});
