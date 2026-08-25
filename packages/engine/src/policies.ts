import type { MarkdownPlan } from './types.js';

/** Leave the price alone all day. The floor against which everything is judged. */
export const NO_MARKDOWN_PLAN: MarkdownPlan = Object.freeze([]);

/**
 * What the store does today: a quarter off at 15:00 and a half off at 18:00,
 * applied to every line whatever its stock, life or rate of sale.
 */
export const CURRENT_STORE_POLICY: MarkdownPlan = Object.freeze([
  Object.freeze({ hour: 8, reduction: 0.25 }),
  Object.freeze({ hour: 11, reduction: 0.5 }),
]);
