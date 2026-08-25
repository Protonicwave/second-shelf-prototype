/**
 * Returns a generator of numbers in [0, 1) for the given seed. Mulberry32 is
 * used because it is small enough to read, has no dependencies, and gives the
 * same sequence in the browser and in the service, which is what lets two
 * people compare figures.
 */
export const createRandom = (seed: number): (() => number) => {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** The seed every published figure is produced from. */
export const DEFAULT_SEED = 20260825;
