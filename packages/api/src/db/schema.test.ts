import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { openDecisionStore } from './index.js';
import { SCHEMA_SQL } from './schema.js';

describe('schema', () => {
  it('carries the same statements as schema.sql', () => {
    const onDisk = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
    expect(SCHEMA_SQL.split('\r\n').join('\n')).toBe(onDisk.split('\r\n').join('\n'));
  });

  it('rejects an override against a decision that was never recorded', () => {
    const store = openDecisionStore(':memory:');
    expect(() =>
      store.recordOverride({
        decisionId: 4321,
        appliedHour: 9,
        appliedReduction: 0.3,
        reason: null,
      }),
    ).toThrow();
    store.close();
  });

  it('round trips a decision and its overrides', () => {
    const store = openDecisionStore(':memory:');
    const [id] = store.recordDecisions([
      {
        lineId: 'bagged-rocket-80g',
        tradingDate: '2026-03-04',
        decisionHour: 9,
        plan: [{ hour: 9, reduction: 0.3 }],
        assumptions: {
          priceSensitivity: 1.8,
          staffCostPerEventPence: 40,
          disposalCostPerUnitPence: 12,
        },
        valueAtRiskPence: 1234,
      },
    ]);
    expect(id).toBeDefined();
    if (id === undefined) return;

    const decision = store.findDecision(id);
    expect(decision?.plan).toEqual([{ hour: 9, reduction: 0.3 }]);
    expect(decision?.assumptions.priceSensitivity).toBe(1.8);

    store.recordOverride({
      decisionId: id,
      appliedHour: 10,
      appliedReduction: 0.5,
      reason: 'shelf was already empty',
    });
    const overrides = store.listOverrides(id);
    expect(overrides).toHaveLength(1);
    expect(overrides[0]?.appliedReduction).toBe(0.5);
    expect(overrides[0]?.reason).toBe('shelf was already empty');
    store.close();
  });

  it('records nothing when handed an empty batch', () => {
    const store = openDecisionStore(':memory:');
    expect(store.recordDecisions([])).toEqual([]);
    store.close();
  });
});
