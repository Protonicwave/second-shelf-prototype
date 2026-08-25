import { simulateLineDay } from './simulate.js';
import type {
  Assumptions,
  DaySettings,
  EvaluatedOption,
  MarkdownPlan,
  MarkdownStage,
  ProductLine,
} from './types.js';

/** Hours at which a first, shallower reduction may be taken. */
const FIRST_HOURS: readonly number[] = [5, 7, 9, 11];
/** Fractions a first reduction may take off the full price. */
const FIRST_REDUCTIONS: readonly number[] = [0.1, 0.2, 0.3, 0.4];
/** Hours at which a second, deeper reduction may be taken. */
const SECOND_HOURS: readonly number[] = [9, 11, 13];
/** Fractions a second reduction may take off the full price. */
const SECOND_REDUCTIONS: readonly number[] = [0.4, 0.5, 0.6, 0.75];

const stagesFrom = (hours: readonly number[], reductions: readonly number[]): MarkdownStage[] => {
  const stages: MarkdownStage[] = [];
  for (const hour of hours) {
    for (const reduction of reductions) {
      stages.push(Object.freeze({ hour, reduction }));
    }
  }
  return stages;
};

const buildCandidates = (): readonly MarkdownPlan[] => {
  const firstStages = stagesFrom(FIRST_HOURS, FIRST_REDUCTIONS);
  const secondStages = stagesFrom(SECOND_HOURS, SECOND_REDUCTIONS);
  const plans: MarkdownPlan[] = [Object.freeze([])];
  for (const stage of firstStages) plans.push(Object.freeze([stage]));
  for (const stage of secondStages) plans.push(Object.freeze([stage]));
  for (const first of firstStages) {
    for (const second of secondStages) {
      if (second.hour > first.hour && second.reduction > first.reduction) {
        plans.push(Object.freeze([first, second]));
      }
    }
  }
  return Object.freeze(plans);
};

/**
 * Every plan the engine will consider, built once at load. The empty plan comes
 * first so it wins any tie and the price is left alone unless a cut earns its
 * place.
 */
export const CANDIDATE_PLANS = buildCandidates();

/** The winning plan for a line, with the single stage options ranked behind it. */
export interface SearchResult {
  readonly best: EvaluatedOption;
  /** Single stage options, highest net value first, for the explanation panel. */
  readonly rankedSingleStage: readonly EvaluatedOption[];
}

const NO_PLAN: MarkdownPlan = Object.freeze([]);

const byNetValue = (a: EvaluatedOption, b: EvaluatedOption): number =>
  b.outcome.netValuePence - a.outcome.netValuePence ||
  a.outcome.markdownEvents - b.outcome.markdownEvents;

/**
 * Returns the highest net value plan for one line on one day, together with the
 * ranked single stage alternatives so a colleague can see what it beat.
 */
export const searchBestPlan = (
  line: ProductLine,
  assumptions: Assumptions,
  day: DaySettings,
): SearchResult => {
  let best: EvaluatedOption = {
    plan: NO_PLAN,
    outcome: simulateLineDay(line, NO_PLAN, assumptions, day),
  };
  const rankedSingleStage: EvaluatedOption[] = [];

  for (const plan of CANDIDATE_PLANS) {
    if (plan.length === 0) continue;
    const option: EvaluatedOption = {
      plan,
      outcome: simulateLineDay(line, plan, assumptions, day),
    };
    if (plan.length === 1) rankedSingleStage.push(option);
    if (byNetValue(option, best) < 0) best = option;
  }

  rankedSingleStage.sort(byNetValue);
  return { best, rankedSingleStage };
};
