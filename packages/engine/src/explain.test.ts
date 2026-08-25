import { describe, expect, it } from 'vitest';
import { explainPlan } from './explain.js';
import type { DaySettings, ProductLine } from './types.js';

const line: ProductLine = {
  id: 'salmon-fillets',
  name: 'Salmon fillets 240g',
  category: 'Fish',
  fullPricePence: 500,
  unitCostPence: 320,
  unitWeightGrams: 240,
  typicalDailyStock: 30,
  baselineUnitsPerHour: 1,
  saleableHoursAtOpen: 15,
  sensitivityMultiplier: 1.2,
};

const day: DaySettings = { stockUnits: 30, demandMultiplier: 1 };

describe('explainPlan', () => {
  it('says to hold the price when there is no plan', () => {
    expect(explainPlan(line, [], day)).toBe(
      'Hold Salmon fillets 240g at full price; the day clears 15 of 30 units without a reduction.',
    );
  });

  it('names the cut, the clock time and the demand reason', () => {
    expect(explainPlan(line, [{ hour: 8, reduction: 0.25 }], day)).toBe(
      'Cut Salmon fillets 240g by 25% at 15:00, because full price sells only 15 of 30 units before close.',
    );
  });

  it('gives life as the reason when the line runs out of hours', () => {
    const sentence = explainPlan(
      { ...line, saleableHoursAtOpen: 9 },
      [{ hour: 5, reduction: 0.3 }],
      day,
    );
    expect(sentence).toBe(
      'Cut Salmon fillets 240g by 30% at 12:00, because it has 9 hours of saleable life left and 30 units to clear.',
    );
  });

  it('names both cuts when the plan has two stages', () => {
    const sentence = explainPlan(
      line,
      [
        { hour: 5, reduction: 0.2 },
        { hour: 11, reduction: 0.5 },
      ],
      day,
    );
    expect(sentence).toBe(
      'Cut Salmon fillets 240g by 20% at 12:00, then to 50% off at 18:00, because full price sells only 15 of 30 units before close.',
    );
  });
});
