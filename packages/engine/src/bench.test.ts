import { describe, expect, it } from 'vitest';
import { benchLines, benchmarkSearch } from './bench.js';
import type { Assumptions } from './types.js';

const assumptions: Assumptions = {
  priceSensitivity: 1.8,
  staffCostPerEventPence: 40,
  disposalCostPerUnitPence: 12,
};

/** Four times the twenty three milliseconds measured locally, so CI does not flake. */
const BUDGET_MS = 100;

describe('search performance', () => {
  it('searches twenty four lines across thirty days inside the budget', () => {
    const lines = benchLines(24);
    benchmarkSearch(lines, assumptions, 5);
    const millis = benchmarkSearch(lines, assumptions, 30);
    expect(millis).toBeLessThan(BUDGET_MS);
  });
});
