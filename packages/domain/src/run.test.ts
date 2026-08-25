import { describe, expect, it } from 'vitest';
import { ASSUMPTION_RANGES, DEFAULT_ASSUMPTIONS, outOfRangeAssumptions } from './assumptions.js';
import { deriveMetrics } from './metrics.js';
import { DEFAULT_SEED } from './random.js';
import { runScenario } from './run.js';
import { buildScenario, DEFAULT_DAY_COUNT } from './scenario.js';

const defaultRun = () =>
  runScenario(buildScenario(DEFAULT_SEED, DEFAULT_DAY_COUNT), DEFAULT_ASSUMPTIONS);

describe('runScenario', () => {
  it('gives byte identical results for the same seed', () => {
    expect(JSON.stringify(defaultRun())).toBe(JSON.stringify(defaultRun()));
  });

  it('gives different results for a different seed', () => {
    const other = runScenario(
      buildScenario(DEFAULT_SEED + 1, DEFAULT_DAY_COUNT),
      DEFAULT_ASSUMPTIONS,
    );
    expect(JSON.stringify(other)).not.toBe(JSON.stringify(defaultRun()));
  });

  it('never scores the engine below the current policy on net value', () => {
    for (const priceSensitivity of [0.6, 1.2, 1.8, 2.5, 3.2]) {
      const run = runScenario(buildScenario(DEFAULT_SEED, 10), {
        ...DEFAULT_ASSUMPTIONS,
        priceSensitivity,
      });
      expect(run.totals.engine.netValuePence).toBeGreaterThanOrEqual(
        run.totals.current.netValuePence,
      );
    }
  });

  it('lets the current policy fall below no markdown at low price sensitivity', () => {
    const run = runScenario(buildScenario(DEFAULT_SEED, DEFAULT_DAY_COUNT), {
      ...DEFAULT_ASSUMPTIONS,
      priceSensitivity: ASSUMPTION_RANGES.priceSensitivity.min,
    });
    expect(run.totals.current.netValuePence).toBeLessThan(run.totals.noMarkdown.netValuePence);
  });

  it('reconciles totals against the sum of the per line aggregates', () => {
    const run = defaultRun();
    const sum = (pick: (value: (typeof run.lines)[number]) => number): number =>
      run.lines.reduce((total, line) => total + pick(line), 0);

    expect(sum((line) => line.engineNetValuePence)).toBeCloseTo(run.totals.engine.netValuePence, 6);
    expect(sum((line) => line.currentNetValuePence)).toBeCloseTo(
      run.totals.current.netValuePence,
      6,
    );
    expect(sum((line) => line.noMarkdownNetValuePence)).toBeCloseTo(
      run.totals.noMarkdown.netValuePence,
      6,
    );
    expect(sum((line) => line.engineUnitsBinned)).toBe(run.totals.engine.unitsBinned);
    expect(sum((line) => line.wasteAvoidedGrams)).toBe(run.wasteAvoidedGrams);
  });

  it('accumulates the day series and ends where the totals do', () => {
    const run = defaultRun();
    const last = run.days[run.days.length - 1];
    expect(run.days).toHaveLength(DEFAULT_DAY_COUNT);
    expect(last?.day).toBe(DEFAULT_DAY_COUNT);
    expect(last?.enginePence).toBeCloseTo(
      run.totals.engine.netValuePence - run.totals.noMarkdown.netValuePence,
      6,
    );
    expect(last?.currentPence).toBeCloseTo(
      run.totals.current.netValuePence - run.totals.noMarkdown.netValuePence,
      6,
    );
  });

  it('holds a sample plan of at most two ordered stages for every line', () => {
    for (const line of defaultRun().lines) {
      expect(line.samplePlan.length).toBeLessThanOrEqual(2);
      const first = line.samplePlan[0];
      const second = line.samplePlan[1];
      if (first !== undefined && second !== undefined) {
        expect(second.hour).toBeGreaterThan(first.hour);
        expect(second.reduction).toBeGreaterThan(first.reduction);
      }
    }
  });

  it('returns empty totals for a scenario with no days', () => {
    const run = runScenario(buildScenario(DEFAULT_SEED, 0), DEFAULT_ASSUMPTIONS);
    expect(run.days).toHaveLength(0);
    expect(run.totals.engine.netValuePence).toBe(0);
    expect(run.lines.every((line) => line.meanStockUnits === 0)).toBe(true);
    expect(deriveMetrics(run).recoveredPercent).toBe(0);
    expect(deriveMetrics(run).marginRetainedPercent).toBe(0);
  });
});

describe('outOfRangeAssumptions', () => {
  it('accepts the defaults', () => {
    expect(outOfRangeAssumptions(DEFAULT_ASSUMPTIONS)).toEqual([]);
  });

  it('names every value that falls outside its range', () => {
    expect(
      outOfRangeAssumptions({
        priceSensitivity: 9,
        staffCostPerEventPence: -1,
        disposalCostPerUnitPence: Number.NaN,
      }),
    ).toEqual(['priceSensitivity', 'staffCostPerEventPence', 'disposalCostPerUnitPence']);
  });
});
