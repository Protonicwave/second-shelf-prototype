import type { FastifyInstance } from 'fastify';
import {
  buildScenario,
  deriveMetrics,
  DEFAULT_DAY_COUNT,
  DEFAULT_SEED,
  runScenario,
} from '@secondshelf/domain';
import {
  ASSUMPTIONS_RESPONSE_SCHEMA,
  ASSUMPTIONS_SCHEMA,
  PLAN_SCHEMA,
  resolveAssumptions,
  type PartialAssumptions,
} from '../schemas.js';

interface RunBody {
  readonly seed?: number;
  readonly dayCount?: number;
  readonly assumptions?: PartialAssumptions;
}

const TOTALS_SCHEMA = {
  type: 'object',
  required: [
    'netValuePence',
    'revenuePence',
    'costOfGoodsSoldPence',
    'unitsSold',
    'unitsBinned',
    'markdownEvents',
  ],
  properties: {
    netValuePence: { type: 'integer' },
    revenuePence: { type: 'integer' },
    costOfGoodsSoldPence: { type: 'integer' },
    unitsSold: { type: 'integer' },
    unitsBinned: { type: 'integer' },
    markdownEvents: { type: 'integer' },
  },
} as const;

const RESPONSE_SCHEMA = {
  type: 'object',
  required: ['seed', 'dayCount', 'assumptions', 'metrics', 'totals', 'days', 'lines'],
  properties: {
    seed: { type: 'integer' },
    dayCount: { type: 'integer' },
    assumptions: ASSUMPTIONS_RESPONSE_SCHEMA,
    metrics: {
      type: 'object',
      required: [
        'valueRecoveredPence',
        'recoveredPercent',
        'marginRetainedPercent',
        'wasteAvoidedGrams',
        'carbonDioxideEquivalentKg',
        'mealEquivalents',
        'unitsRecovered',
        'markdownEvents',
      ],
      properties: {
        valueRecoveredPence: { type: 'integer' },
        recoveredPercent: { type: 'number' },
        marginRetainedPercent: { type: 'number' },
        wasteAvoidedGrams: { type: 'integer' },
        carbonDioxideEquivalentKg: { type: 'number' },
        mealEquivalents: { type: 'number' },
        unitsRecovered: { type: 'integer' },
        markdownEvents: { type: 'integer' },
      },
    },
    totals: {
      type: 'object',
      required: ['engine', 'current', 'noMarkdown'],
      properties: {
        engine: TOTALS_SCHEMA,
        current: TOTALS_SCHEMA,
        noMarkdown: TOTALS_SCHEMA,
      },
    },
    days: {
      type: 'array',
      items: {
        type: 'object',
        required: ['day', 'enginePence', 'currentPence'],
        properties: {
          day: { type: 'integer' },
          enginePence: { type: 'integer' },
          currentPence: { type: 'integer' },
        },
      },
    },
    lines: {
      type: 'array',
      items: {
        type: 'object',
        required: ['lineId', 'name', 'category', 'netValueRecoveredPence', 'samplePlan'],
        properties: {
          lineId: { type: 'string' },
          name: { type: 'string' },
          category: { type: 'string' },
          meanStockUnits: { type: 'number' },
          engineNetValuePence: { type: 'integer' },
          currentNetValuePence: { type: 'integer' },
          noMarkdownNetValuePence: { type: 'integer' },
          netValueRecoveredPence: { type: 'integer' },
          engineUnitsBinned: { type: 'integer' },
          currentUnitsBinned: { type: 'integer' },
          wasteAvoidedGrams: { type: 'integer' },
          samplePlan: PLAN_SCHEMA,
        },
      },
    },
  },
} as const;

/** The longest run the service will simulate in one request. */
const MAX_DAY_COUNT = 90;

/**
 * Adds the route that trades a whole scenario under all three policies and
 * returns the headline metrics with the per day and per line detail behind them.
 */
export const registerRunRoutes = (app: FastifyInstance): void => {
  app.post<{ Body: RunBody }>(
    '/run',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            seed: { type: 'integer', minimum: 0 },
            dayCount: { type: 'integer', minimum: 1, maximum: MAX_DAY_COUNT },
            assumptions: ASSUMPTIONS_SCHEMA,
          },
        },
        response: { 200: RESPONSE_SCHEMA },
      },
    },
    (request) => {
      const body: RunBody = request.body ?? {};
      const assumptions = resolveAssumptions(body.assumptions);
      const seed = body.seed ?? DEFAULT_SEED;
      const dayCount = body.dayCount ?? DEFAULT_DAY_COUNT;
      const result = runScenario(buildScenario(seed, dayCount), assumptions);

      return {
        seed: result.seed,
        dayCount: result.dayCount,
        assumptions: result.assumptions,
        metrics: deriveMetrics(result),
        totals: result.totals,
        days: result.days,
        lines: result.lines,
      };
    },
  );
};
