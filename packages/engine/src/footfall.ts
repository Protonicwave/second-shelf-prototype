/**
 * Relative shopper weight for each trading hour, 07:00 to 21:00.
 *
 * Shaped from the two peaks a food store sees: a smaller lunch peak around
 * midday and a larger early evening peak as people buy on the way home. The
 * curve averages close to 1.0 so a line's baseline hourly velocity reads as a
 * true average rather than a maximum.
 */
export const FOOTFALL_WEIGHTS: readonly number[] = Object.freeze([
  0.5, 0.65, 0.75, 0.9, 1.0, 1.35, 1.3, 0.9, 0.85, 1.05, 1.55, 1.7, 1.3, 0.9, 0.55,
]);
