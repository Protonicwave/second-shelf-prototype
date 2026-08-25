import { describe, expect, it } from 'vitest';
import { CATALOGUE } from './catalogue.js';
import { createRandom, DEFAULT_SEED } from './random.js';
import { buildScenario, DEFAULT_DAY_COUNT } from './scenario.js';

describe('createRandom', () => {
  it('returns the same sequence for the same seed', () => {
    const a = createRandom(DEFAULT_SEED);
    const b = createRandom(DEFAULT_SEED);
    const first = [a(), a(), a(), a()];
    const second = [b(), b(), b(), b()];
    expect(first).toEqual(second);
  });

  it('stays within zero and one', () => {
    const random = createRandom(7);
    for (let i = 0; i < 500; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('buildScenario', () => {
  it('gives a day of stock for every line', () => {
    const scenario = buildScenario(DEFAULT_SEED, DEFAULT_DAY_COUNT);
    expect(scenario.days).toHaveLength(DEFAULT_DAY_COUNT);
    for (const day of scenario.days) {
      expect(day.stockUnits).toHaveLength(CATALOGUE.length);
      expect(day.demandMultiplier).toBeGreaterThan(0.8);
      expect(day.demandMultiplier).toBeLessThan(1.25);
      for (const stock of day.stockUnits) {
        expect(Number.isInteger(stock)).toBe(true);
        expect(stock).toBeGreaterThan(0);
      }
    }
  });

  it('gives identical days for the same seed and different days for another', () => {
    const one = buildScenario(DEFAULT_SEED, 5);
    const same = buildScenario(DEFAULT_SEED, 5);
    const other = buildScenario(DEFAULT_SEED + 1, 5);
    expect(JSON.stringify(one)).toBe(JSON.stringify(same));
    expect(JSON.stringify(one)).not.toBe(JSON.stringify(other));
  });

  it('returns nothing for a day count of zero', () => {
    expect(buildScenario(DEFAULT_SEED, 0).days).toHaveLength(0);
  });
});

describe('CATALOGUE', () => {
  it('holds twenty four lines with whole pence and unique identifiers', () => {
    expect(CATALOGUE).toHaveLength(24);
    const ids = new Set(CATALOGUE.map((line) => line.id));
    expect(ids.size).toBe(CATALOGUE.length);
    for (const line of CATALOGUE) {
      expect(Number.isInteger(line.fullPricePence)).toBe(true);
      expect(Number.isInteger(line.unitCostPence)).toBe(true);
      expect(Number.isInteger(line.unitWeightGrams)).toBe(true);
      expect(line.unitCostPence).toBeLessThan(line.fullPricePence);
    }
  });
});
