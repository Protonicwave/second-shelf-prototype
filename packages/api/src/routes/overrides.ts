import type { FastifyInstance } from 'fastify';
import { TRADING_HOURS, validatePlan } from '@secondshelf/engine';
import type { DecisionStore } from '../db/index.js';
import { ServiceError, serviceErrorFromEngine } from '../errors.js';
import { PLAN_SCHEMA } from '../schemas.js';

interface OverrideBody {
  readonly decisionId: number;
  readonly appliedHour: number;
  readonly appliedReduction: number;
  readonly reason?: string;
}

interface OverrideParams {
  readonly decisionId: number;
}

const OVERRIDE_SCHEMA = {
  type: 'object',
  required: ['id', 'decisionId', 'appliedHour', 'appliedReduction', 'reason', 'createdAt'],
  properties: {
    id: { type: 'integer' },
    decisionId: { type: 'integer' },
    appliedHour: { type: 'integer' },
    appliedReduction: { type: 'number' },
    reason: { type: ['string', 'null'] },
    createdAt: { type: 'string' },
  },
} as const;

const DECISION_SCHEMA = {
  type: 'object',
  required: [
    'id',
    'lineId',
    'tradingDate',
    'decisionHour',
    'plan',
    'valueAtRiskPence',
    'createdAt',
  ],
  properties: {
    id: { type: 'integer' },
    lineId: { type: 'string' },
    tradingDate: { type: 'string' },
    decisionHour: { type: 'integer' },
    plan: PLAN_SCHEMA,
    valueAtRiskPence: { type: 'integer' },
    createdAt: { type: 'string' },
  },
} as const;

/**
 * Adds the routes that record what a colleague actually did about a logged
 * recommendation, and read that history back for one decision.
 */
export const registerOverrideRoutes = (app: FastifyInstance, store: DecisionStore): void => {
  app.post<{ Body: OverrideBody }>(
    '/overrides',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['decisionId', 'appliedHour', 'appliedReduction'],
          properties: {
            decisionId: { type: 'integer', minimum: 1 },
            appliedHour: { type: 'integer', minimum: 0, maximum: TRADING_HOURS - 1 },
            appliedReduction: { type: 'number', minimum: 0, maximum: 1 },
            reason: { type: 'string', maxLength: 240 },
          },
        },
        response: { 201: OVERRIDE_SCHEMA },
      },
    },
    (request, reply) => {
      const body = request.body;
      const decision = store.findDecision(body.decisionId);
      if (decision === undefined) {
        throw new ServiceError(
          404,
          'decision_not_found',
          `No decision ${body.decisionId} has been recorded`,
        );
      }

      if (body.appliedReduction > 0) {
        const error = validatePlan([{ hour: body.appliedHour, reduction: body.appliedReduction }]);
        if (error !== undefined) throw serviceErrorFromEngine(error);
      }

      const stored = store.recordOverride({
        decisionId: body.decisionId,
        appliedHour: body.appliedHour,
        appliedReduction: body.appliedReduction,
        reason: body.reason ?? null,
      });
      return reply.status(201).send(stored);
    },
  );

  app.get<{ Params: OverrideParams }>(
    '/overrides/:decisionId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['decisionId'],
          properties: { decisionId: { type: 'integer', minimum: 1 } },
        },
        response: {
          200: {
            type: 'object',
            required: ['decision', 'overrides'],
            properties: {
              decision: DECISION_SCHEMA,
              overrides: { type: 'array', items: OVERRIDE_SCHEMA },
            },
          },
        },
      },
    },
    (request) => {
      const decision = store.findDecision(request.params.decisionId);
      if (decision === undefined) {
        throw new ServiceError(
          404,
          'decision_not_found',
          `No decision ${request.params.decisionId} has been recorded`,
        );
      }
      return { decision, overrides: store.listOverrides(decision.id) };
    },
  );
};
