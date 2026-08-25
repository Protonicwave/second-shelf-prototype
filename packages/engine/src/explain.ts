import { FOOTFALL_WEIGHTS } from './footfall.js';
import {
  OPEN_HOUR,
  TRADING_HOURS,
  type DaySettings,
  type MarkdownPlan,
  type ProductLine,
} from './types.js';

const clock = (hour: number): string => `${String(OPEN_HOUR + hour).padStart(2, '0')}:00`;

const percent = (reduction: number): string => `${Math.round(reduction * 100)}%`;

/**
 * Returns one plain sentence a colleague can act on, naming the reduction, the
 * time and the reason for it. The reason comes from whether the line runs out
 * of saleable life before the day can sell it or simply sells too slowly.
 */
export const explainPlan = (line: ProductLine, plan: MarkdownPlan, day: DaySettings): string => {
  const life = line.saleableHoursAtOpen < TRADING_HOURS ? line.saleableHoursAtOpen : TRADING_HOURS;
  let projected = 0;
  for (let hour = 0; hour < life; hour += 1) {
    projected += line.baselineUnitsPerHour * (FOOTFALL_WEIGHTS[hour] ?? 0) * day.demandMultiplier;
  }
  const clears = Math.min(Math.round(projected), day.stockUnits);

  const first = plan[0];
  if (first === undefined) {
    return `Hold ${line.name} at full price; the day clears ${clears} of ${day.stockUnits} units without a reduction.`;
  }

  const reason =
    life < TRADING_HOURS
      ? `it has ${life} hours of saleable life left and ${day.stockUnits} units to clear`
      : `full price sells only ${clears} of ${day.stockUnits} units before close`;

  const second = plan[1];
  const action =
    second === undefined
      ? `Cut ${line.name} by ${percent(first.reduction)} at ${clock(first.hour)}`
      : `Cut ${line.name} by ${percent(first.reduction)} at ${clock(first.hour)}, then to ${percent(second.reduction)} off at ${clock(second.hour)}`;

  return `${action}, because ${reason}.`;
};
