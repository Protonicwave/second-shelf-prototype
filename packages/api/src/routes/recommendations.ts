import type { FastifyInstance } from 'fastify';
import {
  explainPlan,
  NO_MARKDOWN_PLAN,
  OPEN_HOUR,
  searchBestPlan,
  simulateLineDay,
  TRADING_HOURS,
  type Assumptions,
  type MarkdownPlan,
  type ProductLine,
} from '@secondshelf/engine';
import { buildScenario, CATALOGUE, DEFAULT_SEED } from '@secondshelf/domain';
import type { DecisionRecord, DecisionStore } from '../db/index.js';
import { ServiceError } from '../errors.js';
import {
  ASSUMPTIONS_RESPONSE_SCHEMA,
  ASSUMPTIONS_SCHEMA,
  PLAN_SCHEMA,
  resolveAssumptions,
  type PartialAssumptions,
} from '../schemas.js';

interface RecommendationsBody {
  readonly hour: number;
  readonly seed?: number;
  readonly day?: number;
  readonly tradingDate?: string;
  readonly assumptions?: PartialAssumptions;
}

interface Recommendation {
  decisionId: number | null;
  readonly lineId: string;
  readonly name: string;
  readonly category: string;
  readonly stockUnits: number;
  readonly unitsAtRisk: number;
  readonly valueAtRiskPence: number;
  readonly plan: MarkdownPlan;
  readonly dueNow: boolean;
  readonly nextActionHour: number | null;
  readonly currentPricePence: number;
  readonly recommendedPricePence: number;
  readonly netValueUpliftPence: number;
  readonly explanation: string;
}

const TRADING_DATE_PATTERN = '^\\d{4}-\\d{2}-\\d{2}$';

const RESPONSE_SCHEMA = {
  type: 'object',
  required: ['tradingDate', 'hour', 'clock', 'seed', 'day', 'assumptions', 'recommendations'],
  properties: {
    tradingDate: { type: 'string' },
    hour: { type: 'integer' },
    clock: { type: 'string' },
    seed: { type: 'integer' },
    day: { type: 'integer' },
    assumptions: ASSUMPTIONS_RESPONSE_SCHEMA,
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'decisionId',
          'lineId',
          'name',
          'category',
          'stockUnits',
          'unitsAtRisk',
          'valueAtRiskPence',
          'plan',
          'dueNow',
          'nextActionHour',
          'currentPricePence',
          'recommendedPricePence',
          'netValueUpliftPence',
          'explanation',
        ],
        properties: {
          decisionId: { type: ['integer', 'null'] },
          lineId: { type: 'string' },
          name: { type: 'string' },
          category: { type: 'string' },
          stockUnits: { type: 'integer' },
          unitsAtRisk: { type: 'integer' },
          valueAtRiskPence: { type: 'integer' },
          plan: PLAN_SCHEMA,
          dueNow: { type: 'boolean' },
          nextActionHour: { type: ['integer', 'null'] },
          currentPricePence: { type: 'integer' },
          recommendedPricePence: { type: 'integer' },
          netValueUpliftPence: { type: 'integer' },
          explanation: { type: 'string' },
        },
      },
    },
  },
} as const;

const clockAt = (hour: number): string => `${String(OPEN_HOUR + hour).padStart(2, '0')}:00`;

const priceAt = (line: ProductLine, plan: MarkdownPlan, hour: number): number => {
  let reduction = 0;
  for (const stage of plan) {
    if (stage.hour <= hour) reduction = stage.reduction;
  }
  return Math.round(line.fullPricePence * (1 - reduction));
};

const buildRecommendation = (
  line: ProductLine,
  stockUnits: number,
  demandMultiplier: number,
  assumptions: Assumptions,
  hour: number,
): Recommendation => {
  const day = { stockUnits, demandMultiplier };
  const noMarkdown = simulateLineDay(line, NO_MARKDOWN_PLAN, assumptions, day);
  const best = searchBestPlan(line, assumptions, day).best;
  const nextStage = best.plan.find((stage) => stage.hour >= hour);
  const currentPricePence = priceAt(line, best.plan, hour);

  return {
    decisionId: null,
    lineId: line.id,
    name: line.name,
    category: line.category,
    stockUnits,
    unitsAtRisk: noMarkdown.unitsBinned,
    valueAtRiskPence: noMarkdown.unitsBinned * line.fullPricePence,
    plan: best.plan,
    dueNow: nextStage !== undefined && nextStage.hour === hour,
    nextActionHour: nextStage === undefined ? null : nextStage.hour,
    currentPricePence,
    recommendedPricePence:
      nextStage === undefined
        ? currentPricePence
        : Math.round(line.fullPricePence * (1 - nextStage.reduction)),
    netValueUpliftPence: best.outcome.netValuePence - noMarkdown.netValuePence,
    explanation: explainPlan(line, best.plan, day),
  };
};

const today = (): string => new Date().toISOString().slice(0, 10);

/**
 * Adds the route the colleague handset reads: what to do with every line at a
 * given hour, worst value at risk first, with each actionable recommendation
 * written to the decision log so an override can be recorded against it.
 */
export const registerRecommendationRoutes = (app: FastifyInstance, store: DecisionStore): void => {
  app.post<{ Body: RecommendationsBody }>(
    '/recommendations',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['hour'],
          properties: {
            hour: { type: 'integer', minimum: 0, maximum: TRADING_HOURS - 1 },
            seed: { type: 'integer', minimum: 0 },
            day: { type: 'integer', minimum: 1, maximum: 90 },
            tradingDate: { type: 'string', pattern: TRADING_DATE_PATTERN },
            assumptions: ASSUMPTIONS_SCHEMA,
          },
        },
        response: { 200: RESPONSE_SCHEMA },
      },
    },
    (request) => {
      const body = request.body;
      const assumptions = resolveAssumptions(body.assumptions);
      const seed = body.seed ?? DEFAULT_SEED;
      const day = body.day ?? 1;
      const tradingDate = body.tradingDate ?? today();

      const scenarioDay = buildScenario(seed, day).days[day - 1];
      if (scenarioDay === undefined) {
        throw new ServiceError(400, 'day_not_in_scenario', `Day ${day} is not in the scenario`);
      }

      const recommendations: Recommendation[] = [];
      for (let index = 0; index < CATALOGUE.length; index += 1) {
        const line = CATALOGUE[index];
        const stockUnits = scenarioDay.stockUnits[index];
        if (line === undefined || stockUnits === undefined) continue;
        recommendations.push(
          buildRecommendation(
            line,
            stockUnits,
            scenarioDay.demandMultiplier,
            assumptions,
            body.hour,
          ),
        );
      }

      recommendations.sort(
        (a, b) =>
          b.valueAtRiskPence - a.valueAtRiskPence ||
          (a.lineId < b.lineId ? -1 : a.lineId > b.lineId ? 1 : 0),
      );

      const actionable = recommendations.filter((item) => item.plan.length > 0);
      const records: DecisionRecord[] = actionable.map((item) => ({
        lineId: item.lineId,
        tradingDate,
        decisionHour: body.hour,
        plan: item.plan,
        assumptions,
        valueAtRiskPence: item.valueAtRiskPence,
      }));
      const ids = store.recordDecisions(records);
      for (let index = 0; index < actionable.length; index += 1) {
        const item = actionable[index];
        const id = ids[index];
        if (item !== undefined && id !== undefined) item.decisionId = id;
      }

      return {
        tradingDate,
        hour: body.hour,
        clock: clockAt(body.hour),
        seed,
        day,
        assumptions,
        recommendations,
      };
    },
  );
};
