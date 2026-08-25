import type { Assumptions } from '@secondshelf/engine';

/** The values the published figures are produced at. */
export const DEFAULT_ASSUMPTIONS: Assumptions = Object.freeze({
  priceSensitivity: 1.8,
  staffCostPerEventPence: 40,
  disposalCostPerUnitPence: 12,
});

/** The inclusive bounds and step of one adjustable value. */
export interface AssumptionRange {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

/**
 * The range each adjustable value may take. Anything outside is rejected
 * rather than clamped, so a caller is never quietly given a different answer
 * from the one it asked for.
 */
export const ASSUMPTION_RANGES: Readonly<Record<keyof Assumptions, AssumptionRange>> =
  Object.freeze({
    priceSensitivity: Object.freeze({ min: 0.6, max: 3.2, step: 0.1 }),
    staffCostPerEventPence: Object.freeze({ min: 0, max: 200, step: 5 }),
    disposalCostPerUnitPence: Object.freeze({ min: 0, max: 60, step: 2 }),
  });

const KEYS: readonly (keyof Assumptions)[] = [
  'priceSensitivity',
  'staffCostPerEventPence',
  'disposalCostPerUnitPence',
];

/**
 * Returns the names of the assumptions that fall outside their permitted range,
 * empty when every value is usable.
 */
export const outOfRangeAssumptions = (assumptions: Assumptions): readonly (keyof Assumptions)[] => {
  const bad: (keyof Assumptions)[] = [];
  for (const key of KEYS) {
    const range = ASSUMPTION_RANGES[key];
    const value = assumptions[key];
    if (!Number.isFinite(value) || value < range.min || value > range.max) bad.push(key);
  }
  return bad;
};
