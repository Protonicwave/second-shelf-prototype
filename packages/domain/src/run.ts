import {
  CURRENT_STORE_POLICY,
  NO_MARKDOWN_PLAN,
  searchBestPlan,
  simulateLineDay,
  type Assumptions,
  type Category,
  type DayOutcome,
  type MarkdownPlan,
} from '@secondshelf/engine';
import { CATALOGUE } from './catalogue.js';
import type { Scenario } from './scenario.js';

/** What one policy earned and wasted across every line and every day. */
export interface PolicyTotals {
  readonly netValuePence: number;
  readonly revenuePence: number;
  readonly costOfGoodsSoldPence: number;
  readonly unitsSold: number;
  readonly unitsBinned: number;
  readonly markdownEvents: number;
}

/** Value recovered against no markdown at all, accumulated to the end of a day. */
export interface CumulativePoint {
  /** Day number, counting from one. */
  readonly day: number;
  readonly enginePence: number;
  readonly currentPence: number;
}

/** How one line fared across the whole scenario. */
export interface LineAggregate {
  readonly lineId: string;
  readonly name: string;
  readonly category: Category;
  readonly meanStockUnits: number;
  readonly engineNetValuePence: number;
  readonly currentNetValuePence: number;
  readonly noMarkdownNetValuePence: number;
  /** Engine net value less current policy net value, across every day. */
  readonly netValueRecoveredPence: number;
  readonly engineUnitsBinned: number;
  readonly currentUnitsBinned: number;
  readonly wasteAvoidedGrams: number;
  /** The plan the engine chose on a representative day, for the line table. */
  readonly samplePlan: MarkdownPlan;
}

/** Everything a page or a route needs from one scenario at one set of assumptions. */
export interface RunResult {
  readonly seed: number;
  readonly dayCount: number;
  readonly assumptions: Assumptions;
  readonly days: readonly CumulativePoint[];
  readonly lines: readonly LineAggregate[];
  readonly totals: {
    readonly engine: PolicyTotals;
    readonly current: PolicyTotals;
    readonly noMarkdown: PolicyTotals;
  };
  /** Weight of stock the engine sold that the current policy would have binned. */
  readonly wasteAvoidedGrams: number;
  /** Units the engine sold above what the current policy sold. */
  readonly unitsRecovered: number;
}

/** The day whose chosen plan is shown in the line table. */
const SAMPLE_PLAN_DAY_INDEX = 14;

interface Running {
  netValuePence: number;
  revenuePence: number;
  costOfGoodsSoldPence: number;
  unitsSold: number;
  unitsBinned: number;
  markdownEvents: number;
}

const emptyRunning = (): Running => ({
  netValuePence: 0,
  revenuePence: 0,
  costOfGoodsSoldPence: 0,
  unitsSold: 0,
  unitsBinned: 0,
  markdownEvents: 0,
});

const accumulate = (into: Running, outcome: DayOutcome, unitCostPence: number): void => {
  into.netValuePence += outcome.netValuePence;
  into.revenuePence += outcome.revenuePence;
  into.costOfGoodsSoldPence += outcome.unitsSold * unitCostPence;
  into.unitsSold += outcome.unitsSold;
  into.unitsBinned += outcome.unitsBinned;
  into.markdownEvents += outcome.markdownEvents;
};

const freezeTotals = (running: Running): PolicyTotals => Object.freeze({ ...running });

/**
 * Returns the result of trading a scenario three ways, under no markdown, under
 * the current store policy and under the plan the engine picks for each line on
 * each day. Pure, so the same scenario and assumptions always give the same
 * figures.
 */
export const runScenario = (scenario: Scenario, assumptions: Assumptions): RunResult => {
  const engineTotals = emptyRunning();
  const currentTotals = emptyRunning();
  const noMarkdownTotals = emptyRunning();

  const perLine = CATALOGUE.map((line) => ({
    line,
    stockUnits: 0,
    engineNetValuePence: 0,
    currentNetValuePence: 0,
    noMarkdownNetValuePence: 0,
    engineUnitsBinned: 0,
    currentUnitsBinned: 0,
    wasteAvoidedGrams: 0,
    samplePlan: NO_MARKDOWN_PLAN,
  }));

  const days: CumulativePoint[] = [];
  let wasteAvoidedGrams = 0;
  let unitsRecovered = 0;

  for (let day = 0; day < scenario.days.length; day += 1) {
    const scenarioDay = scenario.days[day];
    if (scenarioDay === undefined) continue;
    for (let index = 0; index < perLine.length; index += 1) {
      const aggregate = perLine[index];
      const stockUnits = scenarioDay.stockUnits[index];
      if (aggregate === undefined || stockUnits === undefined) continue;
      const line = aggregate.line;

      const settings = { stockUnits, demandMultiplier: scenarioDay.demandMultiplier };
      const noMarkdown = simulateLineDay(line, NO_MARKDOWN_PLAN, assumptions, settings);
      const current = simulateLineDay(line, CURRENT_STORE_POLICY, assumptions, settings);
      const engine = searchBestPlan(line, assumptions, settings).best;

      accumulate(noMarkdownTotals, noMarkdown, line.unitCostPence);
      accumulate(currentTotals, current, line.unitCostPence);
      accumulate(engineTotals, engine.outcome, line.unitCostPence);

      const binnedSaved = Math.max(0, current.unitsBinned - engine.outcome.unitsBinned);
      const soldExtra = Math.max(0, engine.outcome.unitsSold - current.unitsSold);
      wasteAvoidedGrams += binnedSaved * line.unitWeightGrams;
      unitsRecovered += soldExtra;

      aggregate.stockUnits += stockUnits;
      aggregate.engineNetValuePence += engine.outcome.netValuePence;
      aggregate.currentNetValuePence += current.netValuePence;
      aggregate.noMarkdownNetValuePence += noMarkdown.netValuePence;
      aggregate.engineUnitsBinned += engine.outcome.unitsBinned;
      aggregate.currentUnitsBinned += current.unitsBinned;
      aggregate.wasteAvoidedGrams += binnedSaved * line.unitWeightGrams;
      if (day === SAMPLE_PLAN_DAY_INDEX) aggregate.samplePlan = engine.plan;
    }

    days.push(
      Object.freeze({
        day: day + 1,
        enginePence: engineTotals.netValuePence - noMarkdownTotals.netValuePence,
        currentPence: currentTotals.netValuePence - noMarkdownTotals.netValuePence,
      }),
    );
  }

  const dayCount = scenario.days.length;
  const lines = perLine.map((totals) => {
    return Object.freeze({
      lineId: totals.line.id,
      name: totals.line.name,
      category: totals.line.category,
      meanStockUnits: dayCount > 0 ? totals.stockUnits / dayCount : 0,
      engineNetValuePence: totals.engineNetValuePence,
      currentNetValuePence: totals.currentNetValuePence,
      noMarkdownNetValuePence: totals.noMarkdownNetValuePence,
      netValueRecoveredPence: totals.engineNetValuePence - totals.currentNetValuePence,
      engineUnitsBinned: totals.engineUnitsBinned,
      currentUnitsBinned: totals.currentUnitsBinned,
      wasteAvoidedGrams: totals.wasteAvoidedGrams,
      samplePlan: totals.samplePlan,
    });
  });

  return Object.freeze({
    seed: scenario.seed,
    dayCount,
    assumptions,
    days: Object.freeze(days),
    lines: Object.freeze(lines),
    totals: Object.freeze({
      engine: freezeTotals(engineTotals),
      current: freezeTotals(currentTotals),
      noMarkdown: freezeTotals(noMarkdownTotals),
    }),
    wasteAvoidedGrams,
    unitsRecovered,
  });
};
