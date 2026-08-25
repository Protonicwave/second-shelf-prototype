import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_ASSUMPTIONS } from './assumptions.js';
import { deriveMetrics } from './metrics.js';
import { DEFAULT_SEED } from './random.js';
import { runScenario } from './run.js';
import { buildScenario, DEFAULT_DAY_COUNT } from './scenario.js';

const fixture = readFileSync(
  new URL('./fixtures/golden-run.json', import.meta.url),
  'utf8',
).trimEnd();

describe('golden master', () => {
  it('matches the committed default run exactly', () => {
    const run = runScenario(buildScenario(DEFAULT_SEED, DEFAULT_DAY_COUNT), DEFAULT_ASSUMPTIONS);
    const current = JSON.stringify({ run, metrics: deriveMetrics(run) }, null, 2);
    expect(current).toBe(fixture);
  });
});
