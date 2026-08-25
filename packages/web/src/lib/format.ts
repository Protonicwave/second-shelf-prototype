import { OPEN_HOUR, type MarkdownPlan } from '@secondshelf/engine';

const LOCALE = 'en-GB';

/** Returns integer pence as a pounds string with UK grouping, for example £12,480. */
export const formatPounds = (pence: number, decimalPlaces = 0): string => {
  const pounds = Math.abs(pence) / 100;
  const body = pounds.toLocaleString(LOCALE, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
  return `${pence < 0 ? '-' : ''}£${body}`;
};

/** Returns a number rounded to a whole value with UK grouping, for example 1,204. */
export const formatInteger = (value: number): string =>
  Math.round(value).toLocaleString(LOCALE, { maximumFractionDigits: 0 });

/** Returns a number to a fixed number of places with UK grouping, for example 1.8. */
export const formatDecimal = (value: number, decimalPlaces = 1): string =>
  value.toLocaleString(LOCALE, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });

/** Returns a fraction of one hundred as a signed percentage, for example +18%. */
export const formatPercentChange = (percent: number, decimalPlaces = 0): string =>
  `${percent >= 0 ? '+' : '-'}${formatDecimal(Math.abs(percent), decimalPlaces)}%`;

/** Returns a percentage without a sign, for example 34%. */
export const formatPercent = (percent: number, decimalPlaces = 0): string =>
  `${formatDecimal(percent, decimalPlaces)}%`;

/** Returns grams as a kilogram string, for example 412 kg. */
export const formatKilograms = (grams: number, decimalPlaces = 0): string =>
  `${formatDecimal(grams / 1000, decimalPlaces)} kg`;

/** Returns a trading hour index as a wall clock time, for example 15:00 for hour 8. */
export const formatClockTime = (hourIndex: number): string => {
  const hour = OPEN_HOUR + hourIndex;
  return `${String(hour).padStart(2, '0')}:00`;
};

/** Returns a reduction fraction as a shelf edge label, for example 25% off. */
export const formatReduction = (reduction: number): string => `${Math.round(reduction * 100)}% off`;

/**
 * Returns a reduced price in pence rounded to a figure a label gun can actually
 * print: the nearest five pence, and never below five pence.
 */
export const roundToLabelPrice = (pence: number): number => {
  const rounded = Math.round(pence / 5) * 5;
  return rounded < 5 ? 5 : rounded;
};

/**
 * Returns a plan as the instruction a colleague reads, for example 25% at
 * 15:00, 50% at 18:00. An empty plan reads as leaving the price alone.
 */
export const formatPlan = (plan: MarkdownPlan): string =>
  plan.length === 0
    ? 'No change'
    : plan
        .map((stage) => `${Math.round(stage.reduction * 100)}% at ${formatClockTime(stage.hour)}`)
        .join(', ');
