import { describe, expect, it } from 'vitest';
import { DEFAULT_ASSUMPTIONS } from './assumptions.js';
import { CO2E_KG_PER_KG_AVOIDED, deriveMetrics, MEALS_PER_KG_AVOIDED } from './metrics.js';
import { DEFAULT_SEED } from './random.js';
import { runScenario } from './run.js';
import { buildScenario, DEFAULT_DAY_COUNT } from './scenario.js';

const run = runScenario(buildScenario(DEFAULT_SEED, DEFAULT_DAY_COUNT), DEFAULT_ASSUMPTIONS);
const metrics = deriveMetrics(run);

describe('deriveMetrics', () => {
  it('recovers value against the current policy', () => {
    expect(metrics.valueRecoveredPence).toBeGreaterThan(0);
    expect(metrics.valueRecoveredPence).toBe(
      run.totals.engine.netValuePence - run.totals.current.netValuePence,
    );
    expect(metrics.recoveredPercent).toBeGreaterThan(0);
  });

  it('keeps margin between zero and one hundred per cent', () => {
    expect(metrics.marginRetainedPercent).toBeGreaterThan(0);
    expect(metrics.marginRetainedPercent).toBeLessThan(100);
  });

  it('converts avoided waste to carbon and meals at the stated factors', () => {
    const kilograms = run.wasteAvoidedGrams / 1000;
    expect(metrics.carbonDioxideEquivalentKg).toBeCloseTo(kilograms * CO2E_KG_PER_KG_AVOIDED, 9);
    expect(metrics.mealEquivalents).toBeCloseTo(kilograms * MEALS_PER_KG_AVOIDED, 9);
  });

  it('carries the units recovered and markdown events straight from the run', () => {
    expect(metrics.unitsRecovered).toBe(run.unitsRecovered);
    expect(metrics.markdownEvents).toBe(run.totals.engine.markdownEvents);
  });
});
