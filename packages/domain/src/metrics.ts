import type { RunResult } from './run.js';

/**
 * Kilograms of carbon dioxide equivalent avoided per kilogram of food kept out
 * of the bin. Source: WRAP, Food Surplus and Waste in the UK, conversion
 * factors for household and retail food waste.
 */
export const CO2E_KG_PER_KG_AVOIDED = 2.5;

/**
 * Meals a kilogram of surplus food is treated as providing. Source: FareShare,
 * which redistributes at roughly 2.1 meals to the kilogram.
 */
export const MEALS_PER_KG_AVOIDED = 2.1;

/** The figures the page puts in front of a reader, all derived from one run. */
export interface Metrics {
  /** Engine net value less current policy net value, across the whole run. */
  readonly valueRecoveredPence: number;
  /** That recovery as a percentage of what the current policy returns. */
  readonly recoveredPercent: number;
  /** Gross margin the engine keeps on what it sells. */
  readonly marginRetainedPercent: number;
  readonly wasteAvoidedGrams: number;
  readonly carbonDioxideEquivalentKg: number;
  readonly mealEquivalents: number;
  readonly unitsRecovered: number;
  readonly markdownEvents: number;
}

/**
 * Returns the headline figures for a run. Percentages are held as numbers, not
 * strings, so the presentation layer decides how many places to show.
 */
export const deriveMetrics = (run: RunResult): Metrics => {
  const { engine, current } = run.totals;
  const valueRecoveredPence = engine.netValuePence - current.netValuePence;
  const currentMagnitude = Math.abs(current.netValuePence);
  const wasteAvoidedKg = run.wasteAvoidedGrams / 1000;

  return {
    valueRecoveredPence,
    recoveredPercent: currentMagnitude > 0 ? (valueRecoveredPence / currentMagnitude) * 100 : 0,
    marginRetainedPercent:
      engine.revenuePence > 0
        ? ((engine.revenuePence - engine.costOfGoodsSoldPence) / engine.revenuePence) * 100
        : 0,
    wasteAvoidedGrams: run.wasteAvoidedGrams,
    carbonDioxideEquivalentKg: wasteAvoidedKg * CO2E_KG_PER_KG_AVOIDED,
    mealEquivalents: wasteAvoidedKg * MEALS_PER_KG_AVOIDED,
    unitsRecovered: run.unitsRecovered,
    markdownEvents: engine.markdownEvents,
  };
};
