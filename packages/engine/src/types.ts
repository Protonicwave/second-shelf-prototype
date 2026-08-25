/** Number of trading hours in a day, indexed 0 to 14. */
export const TRADING_HOURS = 15;

/** Clock hour at which the store opens. Hour index 0 is this hour. */
export const OPEN_HOUR = 7;

/** The fresh categories carried by the store. */
export type Category = 'Produce' | 'Meat' | 'Fish' | 'Bakery' | 'Dairy' | 'Chilled' | 'Food to go';

/** One sellable product line as it stands at opening time. */
export interface ProductLine {
  readonly id: string;
  readonly name: string;
  readonly category: Category;
  /** Shelf price before any reduction, in whole pence. */
  readonly fullPricePence: number;
  /** Cost of one unit to the store, in whole pence. */
  readonly unitCostPence: number;
  /** Weight of one unit, in whole grams. */
  readonly unitWeightGrams: number;
  /** Units on the shelf on a typical trading day. */
  readonly typicalDailyStock: number;
  /** Units sold in an average hour at full price. */
  readonly baselineUnitsPerHour: number;
  /** Hours of saleable life left at open. Beyond this the line cannot be sold. */
  readonly saleableHoursAtOpen: number;
  /** How much more this category responds to a reduction than the average line. */
  readonly sensitivityMultiplier: number;
}

/** One reduction applied at one hour index for the rest of the day. */
export interface MarkdownStage {
  /** Hour index, 0 to 14. */
  readonly hour: number;
  /** Fraction taken off the full price, between 0 and 1. */
  readonly reduction: number;
}

/** An ordered plan of at most two stages. An empty plan means no reduction. */
export type MarkdownPlan = readonly MarkdownStage[];

/** The values a user may adjust to test how sensitive the result is. */
export interface Assumptions {
  /** How strongly demand responds to a reduction, across every line. */
  readonly priceSensitivity: number;
  /** Colleague time cost of applying one markdown to one line, in pence. */
  readonly staffCostPerEventPence: number;
  /** Cost of disposing of one unsold unit, in pence. */
  readonly disposalCostPerUnitPence: number;
}

/** The stock and trade of one line on one particular day. */
export interface DaySettings {
  /** Units on the shelf at open. */
  readonly stockUnits: number;
  /** Scales the whole footfall curve for this day. */
  readonly demandMultiplier: number;
}

/** What one line earned and wasted over one trading day. */
export interface DayOutcome {
  readonly revenuePence: number;
  readonly unitsSold: number;
  readonly unitsBinned: number;
  readonly markdownEvents: number;
  /** Revenue less the cost of what was binned and the cost of the markdowns applied. */
  readonly netValuePence: number;
}

/** A candidate plan together with the day it produced. */
export interface EvaluatedOption {
  readonly plan: MarkdownPlan;
  readonly outcome: DayOutcome;
}

/** Why a plan was rejected before it was simulated. */
export type EngineErrorCode =
  'too_many_stages' | 'invalid_hour' | 'invalid_reduction' | 'stage_not_later' | 'stage_not_deeper';

/** A rejection carried as a value. The engine never throws. */
export interface EngineError {
  readonly code: EngineErrorCode;
  readonly message: string;
}

/** Either a value or a typed error, never both. */
export type Result<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: EngineError };
