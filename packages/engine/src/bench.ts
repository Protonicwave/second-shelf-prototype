import { searchBestPlan } from './search.js';
import type { Assumptions, Category, ProductLine } from './types.js';

const CATEGORIES: readonly Category[] = [
  'Produce',
  'Meat',
  'Fish',
  'Bakery',
  'Dairy',
  'Chilled',
  'Food to go',
];

/** Returns a synthetic range shaped like a real fresh counter, for timing only. */
export const benchLines = (count: number): readonly ProductLine[] => {
  const lines: ProductLine[] = [];
  for (let index = 0; index < count; index += 1) {
    lines.push({
      id: `bench-${index}`,
      name: `Bench line ${index}`,
      category: CATEGORIES[index % CATEGORIES.length] ?? 'Produce',
      fullPricePence: 150 + index * 37,
      unitCostPence: 60 + index * 14,
      unitWeightGrams: 200 + index * 25,
      typicalDailyStock: 20 + (index % 9) * 6,
      baselineUnitsPerHour: 1 + (index % 5) * 0.7,
      saleableHoursAtOpen: 6 + (index % 10),
      sensitivityMultiplier: 0.8 + (index % 4) * 0.2,
    });
  }
  return lines;
};

/** Returns how long a full search over every line and every day took, in milliseconds. */
export const benchmarkSearch = (
  lines: readonly ProductLine[],
  assumptions: Assumptions,
  days: number,
): number => {
  const started = performance.now();
  for (let day = 0; day < days; day += 1) {
    const demandMultiplier = 0.85 + (day % 7) * 0.05;
    for (const line of lines) {
      searchBestPlan(line, assumptions, {
        stockUnits: line.typicalDailyStock,
        demandMultiplier,
      });
    }
  }
  return performance.now() - started;
};
