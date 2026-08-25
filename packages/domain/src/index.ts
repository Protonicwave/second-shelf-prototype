export { CATALOGUE } from './catalogue.js';
export { createRandom, DEFAULT_SEED } from './random.js';
export {
  ASSUMPTION_RANGES,
  DEFAULT_ASSUMPTIONS,
  outOfRangeAssumptions,
  type AssumptionRange,
} from './assumptions.js';
export { buildScenario, DEFAULT_DAY_COUNT, type Scenario, type ScenarioDay } from './scenario.js';
export {
  runScenario,
  type CumulativePoint,
  type LineAggregate,
  type PolicyTotals,
  type RunResult,
} from './run.js';
export {
  CO2E_KG_PER_KG_AVOIDED,
  deriveMetrics,
  MEALS_PER_KG_AVOIDED,
  type Metrics,
} from './metrics.js';
