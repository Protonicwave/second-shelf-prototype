import type { Assumptions } from '@secondshelf/engine';
import { ASSUMPTION_RANGES, DEFAULT_ASSUMPTIONS, outOfRangeAssumptions } from '@secondshelf/domain';
import { ServiceError } from './errors.js';

/** The assumption values a caller may send, any of which fall back to the default. */
export interface PartialAssumptions {
  readonly priceSensitivity?: number;
  readonly staffCostPerEventPence?: number;
  readonly disposalCostPerUnitPence?: number;
}

/**
 * The request fragment for an assumption set. Bounds come from the domain so
 * the service and the page cannot disagree about what is allowed.
 */
export const ASSUMPTIONS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    priceSensitivity: {
      type: 'number',
      minimum: ASSUMPTION_RANGES.priceSensitivity.min,
      maximum: ASSUMPTION_RANGES.priceSensitivity.max,
    },
    staffCostPerEventPence: {
      type: 'number',
      minimum: ASSUMPTION_RANGES.staffCostPerEventPence.min,
      maximum: ASSUMPTION_RANGES.staffCostPerEventPence.max,
    },
    disposalCostPerUnitPence: {
      type: 'number',
      minimum: ASSUMPTION_RANGES.disposalCostPerUnitPence.min,
      maximum: ASSUMPTION_RANGES.disposalCostPerUnitPence.max,
    },
  },
} as const;

/** The shape an assumption set takes in every response. */
export const ASSUMPTIONS_RESPONSE_SCHEMA = {
  type: 'object',
  required: ['priceSensitivity', 'staffCostPerEventPence', 'disposalCostPerUnitPence'],
  properties: {
    priceSensitivity: { type: 'number' },
    staffCostPerEventPence: { type: 'number' },
    disposalCostPerUnitPence: { type: 'number' },
  },
} as const;

/** The shape a markdown plan takes in every response. */
export const PLAN_SCHEMA = {
  type: 'array',
  maxItems: 2,
  items: {
    type: 'object',
    required: ['hour', 'reduction'],
    properties: {
      hour: { type: 'integer' },
      reduction: { type: 'number' },
    },
  },
} as const;

/**
 * Returns the full assumption set a request asked for, filling in the defaults
 * for anything it left out. Rejects out of range values rather than clamping,
 * so a caller is never quietly answered a different question.
 */
export const resolveAssumptions = (partial: PartialAssumptions | undefined): Assumptions => {
  const assumptions: Assumptions = {
    priceSensitivity: partial?.priceSensitivity ?? DEFAULT_ASSUMPTIONS.priceSensitivity,
    staffCostPerEventPence:
      partial?.staffCostPerEventPence ?? DEFAULT_ASSUMPTIONS.staffCostPerEventPence,
    disposalCostPerUnitPence:
      partial?.disposalCostPerUnitPence ?? DEFAULT_ASSUMPTIONS.disposalCostPerUnitPence,
  };
  const bad = outOfRangeAssumptions(assumptions);
  if (bad.length > 0) {
    throw new ServiceError(400, 'assumptions_out_of_range', `Out of range: ${bad.join(', ')}`);
  }
  return assumptions;
};
