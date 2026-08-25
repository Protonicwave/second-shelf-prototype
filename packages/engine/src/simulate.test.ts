import { describe, expect, it } from 'vitest';
import { CANDIDATE_PLANS } from './search.js';
import { evaluatePlan, simulateLineDay, validatePlan } from './simulate.js';
import { CURRENT_STORE_POLICY, NO_MARKDOWN_PLAN } from './policies.js';
import type { Assumptions, DaySettings, ProductLine } from './types.js';

const assumptions: Assumptions = {
  priceSensitivity: 1.8,
  staffCostPerEventPence: 40,
  disposalCostPerUnitPence: 12,
};

const line: ProductLine = {
  id: 'chicken-thighs',
  name: 'Chicken thighs 1kg',
  category: 'Meat',
  fullPricePence: 450,
  unitCostPence: 260,
  unitWeightGrams: 1000,
  typicalDailyStock: 40,
  baselineUnitsPerHour: 1.4,
  saleableHoursAtOpen: 12,
  sensitivityMultiplier: 1.1,
};

const day: DaySettings = { stockUnits: 40, demandMultiplier: 1 };

describe('simulateLineDay', () => {
  it('returns zero everywhere when there is no stock', () => {
    const outcome = simulateLineDay(line, CURRENT_STORE_POLICY, assumptions, {
      stockUnits: 0,
      demandMultiplier: 1,
    });
    expect(outcome).toEqual({
      revenuePence: 0,
      unitsSold: 0,
      unitsBinned: 0,
      markdownEvents: 0,
      netValuePence: 0,
    });
  });

  it('sells nothing when no saleable life is left at open', () => {
    const outcome = simulateLineDay(
      { ...line, saleableHoursAtOpen: 0 },
      CURRENT_STORE_POLICY,
      assumptions,
      day,
    );
    expect(outcome.unitsSold).toBe(0);
    expect(outcome.revenuePence).toBe(0);
    expect(outcome.markdownEvents).toBe(0);
    expect(outcome.unitsBinned).toBe(day.stockUnits);
  });

  it('never earns more than the stock sold at full price', () => {
    for (const plan of CANDIDATE_PLANS) {
      const outcome = simulateLineDay(line, plan, assumptions, day);
      expect(outcome.revenuePence).toBeLessThanOrEqual(day.stockUnits * line.fullPricePence);
      expect(outcome.unitsSold + outcome.unitsBinned).toBe(day.stockUnits);
    }
  });

  it('gives the same outcome every time for the same inputs', () => {
    const first = simulateLineDay(line, CURRENT_STORE_POLICY, assumptions, day);
    const second = simulateLineDay(line, CURRENT_STORE_POLICY, assumptions, day);
    const third = simulateLineDay(line, [...CURRENT_STORE_POLICY], assumptions, { ...day });
    expect(second).toEqual(first);
    expect(third).toEqual(first);
  });

  it('charges staff cost once for each markdown actually applied', () => {
    const free = simulateLineDay(
      line,
      CURRENT_STORE_POLICY,
      {
        ...assumptions,
        staffCostPerEventPence: 0,
      },
      day,
    );
    const paid = simulateLineDay(
      line,
      CURRENT_STORE_POLICY,
      {
        ...assumptions,
        staffCostPerEventPence: 100,
      },
      day,
    );
    expect(free.markdownEvents).toBe(2);
    expect(free.netValuePence - paid.netValuePence).toBe(200);
  });
});

describe('validatePlan', () => {
  it('accepts the fixed policies and every candidate the search will use', () => {
    expect(validatePlan(NO_MARKDOWN_PLAN)).toBeUndefined();
    expect(validatePlan(CURRENT_STORE_POLICY)).toBeUndefined();
    for (const plan of CANDIDATE_PLANS) {
      expect(validatePlan(plan)).toBeUndefined();
    }
  });

  it('rejects plans that break the shape rules', () => {
    expect(
      validatePlan([
        { hour: 1, reduction: 0.1 },
        { hour: 2, reduction: 0.2 },
        { hour: 3, reduction: 0.3 },
      ])?.code,
    ).toBe('too_many_stages');
    expect(validatePlan([{ hour: 15, reduction: 0.1 }])?.code).toBe('invalid_hour');
    expect(validatePlan([{ hour: 1.5, reduction: 0.1 }])?.code).toBe('invalid_hour');
    expect(validatePlan([{ hour: 1, reduction: 0 }])?.code).toBe('invalid_reduction');
    expect(validatePlan([{ hour: 1, reduction: 1 }])?.code).toBe('invalid_reduction');
    expect(
      validatePlan([
        { hour: 5, reduction: 0.2 },
        { hour: 5, reduction: 0.5 },
      ])?.code,
    ).toBe('stage_not_later');
    expect(
      validatePlan([
        { hour: 5, reduction: 0.5 },
        { hour: 9, reduction: 0.5 },
      ])?.code,
    ).toBe('stage_not_deeper');
  });
});

describe('evaluatePlan', () => {
  it('returns the outcome for a well formed plan', () => {
    const result = evaluatePlan(line, CURRENT_STORE_POLICY, assumptions, day);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(simulateLineDay(line, CURRENT_STORE_POLICY, assumptions, day));
    }
  });

  it('returns the error for a malformed plan rather than throwing', () => {
    const result = evaluatePlan(line, [{ hour: -1, reduction: 0.5 }], assumptions, day);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_hour');
      expect(result.error.message).toContain('trading day');
    }
  });
});
