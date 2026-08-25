import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildScenario,
  DEFAULT_ASSUMPTIONS,
  DEFAULT_SEED,
  deriveMetrics,
  runScenario,
} from '@secondshelf/domain';
import { createServer, type Service } from './server.js';

interface Recommendation {
  readonly decisionId: number | null;
  readonly lineId: string;
  readonly valueAtRiskPence: number;
  readonly plan: readonly { readonly hour: number; readonly reduction: number }[];
  readonly recommendedPricePence: number;
  readonly explanation: string;
}

let service: Service;

beforeEach(async () => {
  service = await createServer({ databaseFile: ':memory:', logger: false });
});

afterEach(async () => {
  await service.app.close();
});

describe('health', () => {
  it('reports the running version', async () => {
    const response = await service.app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json<{ status: string; version: string }>().status).toBe('ok');
  });

  it('answers an unknown route with a typed error', async () => {
    const response = await service.app.inject({ method: 'GET', url: '/nowhere' });
    expect(response.statusCode).toBe(404);
    expect(response.json<{ error: string }>().error).toBe('not_found');
  });
});

describe('run', () => {
  it('returns the same figures as the domain does for the default request', async () => {
    const response = await service.app.inject({ method: 'POST', url: '/run', payload: {} });
    expect(response.statusCode).toBe(200);

    const body = response.json<{
      seed: number;
      dayCount: number;
      metrics: { valueRecoveredPence: number; unitsRecovered: number };
      days: readonly unknown[];
      lines: readonly unknown[];
    }>();
    const expected = deriveMetrics(
      runScenario(buildScenario(DEFAULT_SEED, body.dayCount), DEFAULT_ASSUMPTIONS),
    );

    expect(body.seed).toBe(DEFAULT_SEED);
    expect(body.days).toHaveLength(body.dayCount);
    expect(body.lines).toHaveLength(24);
    expect(body.metrics.valueRecoveredPence).toBe(expected.valueRecoveredPence);
    expect(body.metrics.unitsRecovered).toBe(expected.unitsRecovered);
  });

  it('honours an adjusted assumption set', async () => {
    const response = await service.app.inject({
      method: 'POST',
      url: '/run',
      payload: { dayCount: 3, assumptions: { priceSensitivity: 0.7 } },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json<{ assumptions: { priceSensitivity: number } }>();
    expect(body.assumptions.priceSensitivity).toBe(0.7);
  });

  it('rejects an assumption outside its permitted range', async () => {
    const response = await service.app.inject({
      method: 'POST',
      url: '/run',
      payload: { assumptions: { priceSensitivity: 9 } },
    });
    expect(response.statusCode).toBe(400);
  });

  it('rejects a day count the service will not simulate', async () => {
    const response = await service.app.inject({
      method: 'POST',
      url: '/run',
      payload: { dayCount: 0 },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json<{ error: string }>().error).toBe('invalid_request');
  });
});

describe('recommendations', () => {
  const request = { hour: 8, day: 1, tradingDate: '2026-03-04' };

  it('returns every line, worst value at risk first', async () => {
    const response = await service.app.inject({
      method: 'POST',
      url: '/recommendations',
      payload: request,
    });
    expect(response.statusCode).toBe(200);

    const body = response.json<{ clock: string; recommendations: Recommendation[] }>();
    expect(body.clock).toBe('15:00');
    expect(body.recommendations).toHaveLength(24);
    const risks = body.recommendations.map((item) => item.valueAtRiskPence);
    expect([...risks].sort((a, b) => b - a)).toEqual(risks);
    for (const item of body.recommendations) {
      expect(item.explanation.length).toBeGreaterThan(0);
      expect(item.recommendedPricePence).toBeGreaterThan(0);
    }
  });

  it('uses the same stock as the domain scenario', async () => {
    const response = await service.app.inject({
      method: 'POST',
      url: '/recommendations',
      payload: { ...request, day: 2 },
    });
    const body = response.json<{ recommendations: { lineId: string; stockUnits: number }[] }>();
    const day = buildScenario(DEFAULT_SEED, 2).days[1];
    const total = day?.stockUnits.reduce((sum, units) => sum + units, 0) ?? 0;
    const returned = body.recommendations.reduce((sum, item) => sum + item.stockUnits, 0);
    expect(returned).toBe(total);
  });

  it('logs every actionable recommendation and leaves the rest unlogged', async () => {
    const response = await service.app.inject({
      method: 'POST',
      url: '/recommendations',
      payload: request,
    });
    const items = response.json<{ recommendations: Recommendation[] }>().recommendations;
    const actionable = items.filter((item) => item.plan.length > 0);
    expect(actionable.length).toBeGreaterThan(0);
    for (const item of items) {
      if (item.plan.length > 0) {
        expect(typeof item.decisionId).toBe('number');
      } else {
        expect(item.decisionId).toBeNull();
      }
    }

    const first = actionable[0];
    expect(first).toBeDefined();
    if (first?.decisionId == null) return;
    const stored = service.store.findDecision(first.decisionId);
    expect(stored?.lineId).toBe(first.lineId);
    expect(stored?.tradingDate).toBe('2026-03-04');
    expect(stored?.decisionHour).toBe(8);
  });

  it('rejects an hour outside the trading day', async () => {
    const response = await service.app.inject({
      method: 'POST',
      url: '/recommendations',
      payload: { hour: 15 },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json<{ error: string }>().error).toBe('invalid_request');
  });
});

describe('overrides', () => {
  const recordDecision = async (): Promise<number> => {
    const response = await service.app.inject({
      method: 'POST',
      url: '/recommendations',
      payload: { hour: 8, day: 1, tradingDate: '2026-03-04' },
    });
    const items = response.json<{ recommendations: Recommendation[] }>().recommendations;
    const first = items.find((item) => item.decisionId !== null);
    if (first?.decisionId == null) throw new Error('no decision was recorded');
    return first.decisionId;
  };

  it('records what the colleague actually applied and reads it back', async () => {
    const decisionId = await recordDecision();
    const created = await service.app.inject({
      method: 'POST',
      url: '/overrides',
      payload: { decisionId, appliedHour: 10, appliedReduction: 0.5, reason: 'shelf cleared' },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json<{ decisionId: number }>().decisionId).toBe(decisionId);

    const read = await service.app.inject({ method: 'GET', url: `/overrides/${decisionId}` });
    expect(read.statusCode).toBe(200);
    const body = read.json<{
      decision: { id: number };
      overrides: { appliedReduction: number; reason: string | null }[];
    }>();
    expect(body.decision.id).toBe(decisionId);
    expect(body.overrides).toHaveLength(1);
    expect(body.overrides[0]?.appliedReduction).toBe(0.5);
    expect(body.overrides[0]?.reason).toBe('shelf cleared');
  });

  it('accepts a colleague who applied no reduction at all', async () => {
    const decisionId = await recordDecision();
    const response = await service.app.inject({
      method: 'POST',
      url: '/overrides',
      payload: { decisionId, appliedHour: 10, appliedReduction: 0 },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json<{ reason: string | null }>().reason).toBeNull();
  });

  it('maps an engine rejection onto a bad request', async () => {
    const decisionId = await recordDecision();
    const response = await service.app.inject({
      method: 'POST',
      url: '/overrides',
      payload: { decisionId, appliedHour: 10, appliedReduction: 1 },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json<{ error: string }>().error).toBe('invalid_reduction');
  });

  it('refuses an override against a decision that does not exist', async () => {
    const response = await service.app.inject({
      method: 'POST',
      url: '/overrides',
      payload: { decisionId: 9999, appliedHour: 10, appliedReduction: 0.5 },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json<{ error: string }>().error).toBe('decision_not_found');
  });

  it('refuses a reason longer than the field allows', async () => {
    const decisionId = await recordDecision();
    const response = await service.app.inject({
      method: 'POST',
      url: '/overrides',
      payload: { decisionId, appliedHour: 10, appliedReduction: 0.5, reason: 'x'.repeat(400) },
    });
    expect(response.statusCode).toBe(400);
  });
});
