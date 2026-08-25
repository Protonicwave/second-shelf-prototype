import { CATALOGUE } from './catalogue.js';
import { createRandom } from './random.js';

/** The trading conditions of one day, with stock held in catalogue order. */
export interface ScenarioDay {
  /** Scales the whole footfall curve for the day, so a quiet Tuesday sells less. */
  readonly demandMultiplier: number;
  /** Units on the shelf at open for each line, in catalogue order. */
  readonly stockUnits: readonly number[];
}

/** A run of trading days generated from one seed. */
export interface Scenario {
  readonly seed: number;
  readonly dayCount: number;
  readonly days: readonly ScenarioDay[];
}

/** The number of days the published figures cover. */
export const DEFAULT_DAY_COUNT = 30;

/**
 * Returns the stock and demand of each trading day for a seed. Pure and
 * deterministic, so the same seed always describes the same month of trade
 * whether it is generated in the browser or in the service.
 */
export const buildScenario = (seed: number, dayCount: number): Scenario => {
  const random = createRandom(seed);
  const days: ScenarioDay[] = [];
  for (let day = 0; day < dayCount; day += 1) {
    const demandMultiplier = 0.82 + random() * 0.42;
    const stockUnits: number[] = [];
    for (const line of CATALOGUE) {
      stockUnits.push(Math.round(line.typicalDailyStock * (0.85 + random() * 0.3)));
    }
    days.push(Object.freeze({ demandMultiplier, stockUnits: Object.freeze(stockUnits) }));
  }
  return Object.freeze({ seed, dayCount, days: Object.freeze(days) });
};
