import { FOOTFALL_WEIGHTS } from './footfall.js';
import {
  TRADING_HOURS,
  type Assumptions,
  type DayOutcome,
  type DaySettings,
  type EngineError,
  type MarkdownPlan,
  type ProductLine,
  type Result,
} from './types.js';

/**
 * Returns the revenue, sales, waste and net value of one line over one trading
 * day under one plan. The plan is assumed valid, so callers taking untrusted
 * input should go through evaluatePlan instead.
 */
export const simulateLineDay = (
  line: ProductLine,
  plan: MarkdownPlan,
  assumptions: Assumptions,
  day: DaySettings,
): DayOutcome => {
  const first = plan.length > 0 ? plan[0] : undefined;
  const second = plan.length > 1 ? plan[1] : undefined;
  const firstHour = first === undefined ? -1 : first.hour;
  const firstReduction = first === undefined ? 0 : first.reduction;
  const secondHour = second === undefined ? -1 : second.hour;
  const secondReduction = second === undefined ? 0 : second.reduction;

  const life = line.saleableHoursAtOpen < TRADING_HOURS ? line.saleableHoursAtOpen : TRADING_HOURS;
  const sensitivity = assumptions.priceSensitivity * line.sensitivityMultiplier;

  let stock = day.stockUnits > 0 ? day.stockUnits : 0;
  let reduction = 0;
  let revenuePence = 0;
  let unitsSold = 0;
  let markdownEvents = 0;

  for (let hour = 0; hour < life; hour += 1) {
    if (stock <= 0) break;
    if (hour === firstHour) {
      reduction = firstReduction;
      markdownEvents += 1;
    }
    if (hour === secondHour) {
      reduction = secondReduction;
      markdownEvents += 1;
    }
    const weight = FOOTFALL_WEIGHTS[hour] ?? 0;
    const demand =
      line.baselineUnitsPerHour * weight * day.demandMultiplier * (1 + sensitivity * reduction);
    let units = Math.round(demand);
    if (units > stock) units = stock;
    if (units > 0) {
      revenuePence += units * Math.round(line.fullPricePence * (1 - reduction));
      unitsSold += units;
      stock -= units;
    }
  }

  const unitsBinned = stock;
  const wasteCost = unitsBinned * (line.unitCostPence + assumptions.disposalCostPerUnitPence);
  const labourCost = markdownEvents * assumptions.staffCostPerEventPence;

  return {
    revenuePence,
    unitsSold,
    unitsBinned,
    markdownEvents,
    netValuePence: revenuePence - wasteCost - labourCost,
  };
};

/**
 * Returns the reason a plan is unusable, or undefined when it is well formed.
 * A plan holds at most two stages and the second must be both later and deeper
 * than the first.
 */
export const validatePlan = (plan: MarkdownPlan): EngineError | undefined => {
  if (plan.length > 2) {
    return { code: 'too_many_stages', message: 'A plan holds at most two stages' };
  }
  for (const stage of plan) {
    if (!Number.isInteger(stage.hour) || stage.hour < 0 || stage.hour >= TRADING_HOURS) {
      return { code: 'invalid_hour', message: `Hour ${stage.hour} is outside the trading day` };
    }
    if (!(stage.reduction > 0) || stage.reduction >= 1) {
      return {
        code: 'invalid_reduction',
        message: `Reduction ${stage.reduction} is not above zero and below one`,
      };
    }
  }
  const first = plan[0];
  const second = plan[1];
  if (first !== undefined && second !== undefined) {
    if (second.hour <= first.hour) {
      return {
        code: 'stage_not_later',
        message: 'The second stage must come later than the first',
      };
    }
    if (second.reduction <= first.reduction) {
      return {
        code: 'stage_not_deeper',
        message: 'The second stage must cut deeper than the first',
      };
    }
  }
  return undefined;
};

/**
 * Returns the day a plan produces, or a typed error when the plan is not well
 * formed. This is the entry point for plans that did not come from the search.
 */
export const evaluatePlan = (
  line: ProductLine,
  plan: MarkdownPlan,
  assumptions: Assumptions,
  day: DaySettings,
): Result<DayOutcome> => {
  const error = validatePlan(plan);
  if (error !== undefined) return { ok: false, error };
  return { ok: true, value: simulateLineDay(line, plan, assumptions, day) };
};
