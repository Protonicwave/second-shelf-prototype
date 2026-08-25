import { describe, expect, it } from 'vitest';
import { CANDIDATE_PLANS, searchBestPlan } from './search.js';
import { simulateLineDay } from './simulate.js';
import type { Assumptions, DaySettings, ProductLine } from './types.js';

const assumptions: Assumptions = {
  priceSensitivity: 1.8,
  staffCostPerEventPence: 40,
  disposalCostPerUnitPence: 12,
};

/** Sells out at full price well before close, so any reduction is money given away. */
const fastSeller: ProductLine = {
  id: 'bananas',
  name: 'Bananas loose',
  category: 'Produce',
  fullPricePence: 110,
  unitCostPence: 55,
  unitWeightGrams: 140,
  typicalDailyStock: 20,
  baselineUnitsPerHour: 2,
  saleableHoursAtOpen: 15,
  sensitivityMultiplier: 1,
};

/** Overstocked and short lived, so it bins most of the shelf without a reduction. */
const slowSeller: ProductLine = {
  id: 'sandwich-platter',
  name: 'Sandwich platter',
  category: 'Food to go',
  fullPricePence: 600,
  unitCostPence: 300,
  unitWeightGrams: 450,
  typicalDailyStock: 60,
  baselineUnitsPerHour: 1,
  saleableHoursAtOpen: 14,
  sensitivityMultiplier: 1.4,
};

const day: DaySettings = { stockUnits: 60, demandMultiplier: 1 };

describe('CANDIDATE_PLANS', () => {
  it('holds the empty plan first and no plan longer than two stages', () => {
    expect(CANDIDATE_PLANS[0]).toEqual([]);
    for (const plan of CANDIDATE_PLANS) {
      expect(plan.length).toBeLessThanOrEqual(2);
    }
  });

  it('always makes the second stage later and deeper than the first', () => {
    const twoStage = CANDIDATE_PLANS.filter((plan) => plan.length === 2);
    expect(twoStage.length).toBeGreaterThan(0);
    for (const plan of twoStage) {
      const [first, second] = plan;
      expect(first).toBeDefined();
      expect(second).toBeDefined();
      if (first === undefined || second === undefined) continue;
      expect(second.hour).toBeGreaterThan(first.hour);
      expect(second.reduction).toBeGreaterThan(first.reduction);
    }
  });

  it('is built once and reused across calls', () => {
    const before = CANDIDATE_PLANS;
    searchBestPlan(slowSeller, assumptions, day);
    expect(CANDIDATE_PLANS).toBe(before);
  });
});

describe('searchBestPlan', () => {
  it('leaves the price alone when shoppers barely respond to a reduction', () => {
    const result = searchBestPlan(
      fastSeller,
      { ...assumptions, priceSensitivity: 0.05 },
      {
        stockUnits: 20,
        demandMultiplier: 1,
      },
    );
    expect(result.best.plan).toEqual([]);
    expect(result.best.outcome.markdownEvents).toBe(0);
  });

  it('does not simply take the deepest cut on offer', () => {
    const shallow = simulateLineDay(fastSeller, [{ hour: 5, reduction: 0.1 }], assumptions, {
      stockUnits: 20,
      demandMultiplier: 1,
    });
    const deep = simulateLineDay(fastSeller, [{ hour: 5, reduction: 0.75 }], assumptions, {
      stockUnits: 20,
      demandMultiplier: 1,
    });
    expect(deep.netValuePence).toBeLessThan(shallow.netValuePence);
  });

  it('finds a plan worth more than doing nothing on an overstocked line', () => {
    const result = searchBestPlan(slowSeller, assumptions, day);
    const doNothing = simulateLineDay(slowSeller, [], assumptions, day);
    expect(result.best.plan.length).toBeGreaterThan(0);
    expect(result.best.outcome.netValuePence).toBeGreaterThan(doNothing.netValuePence);
  });

  it('returns the best plan of every candidate it considered', () => {
    const result = searchBestPlan(slowSeller, assumptions, day);
    for (const plan of CANDIDATE_PLANS) {
      const outcome = simulateLineDay(slowSeller, plan, assumptions, day);
      expect(outcome.netValuePence).toBeLessThanOrEqual(result.best.outcome.netValuePence);
    }
  });

  it('ranks the single stage options by net value, highest first', () => {
    const { rankedSingleStage } = searchBestPlan(slowSeller, assumptions, day);
    expect(rankedSingleStage.length).toBeGreaterThan(0);
    for (const option of rankedSingleStage) {
      expect(option.plan.length).toBe(1);
    }
    for (let index = 1; index < rankedSingleStage.length; index += 1) {
      const previous = rankedSingleStage[index - 1];
      const current = rankedSingleStage[index];
      if (previous === undefined || current === undefined) continue;
      expect(previous.outcome.netValuePence).toBeGreaterThanOrEqual(current.outcome.netValuePence);
    }
  });

  it('drops marginal markdowns once colleague time is expensive enough', () => {
    const cheap = searchBestPlan(slowSeller, { ...assumptions, staffCostPerEventPence: 0 }, day);
    const dear = searchBestPlan(
      slowSeller,
      { ...assumptions, staffCostPerEventPence: 500_000 },
      day,
    );
    expect(cheap.best.outcome.markdownEvents).toBeGreaterThan(0);
    expect(dear.best.outcome.markdownEvents).toBe(0);
    expect(dear.best.plan).toEqual([]);
  });
});
