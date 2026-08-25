import { describe, expect, it } from 'vitest';
import {
  formatClockTime,
  formatDecimal,
  formatInteger,
  formatKilograms,
  formatPercent,
  formatPercentChange,
  formatPounds,
  formatReduction,
  roundToLabelPrice,
} from './format';

describe('formatPounds', () => {
  it('groups thousands and defaults to whole pounds', () => {
    expect(formatPounds(1248000)).toBe('£12,480');
  });

  it('shows pence when asked for two places', () => {
    expect(formatPounds(249, 2)).toBe('£2.49');
  });

  it('keeps the sign on a loss', () => {
    expect(formatPounds(-1500)).toBe('-£15');
  });
});

describe('formatInteger', () => {
  it('rounds and groups', () => {
    expect(formatInteger(1204.6)).toBe('1,205');
  });
});

describe('formatDecimal', () => {
  it('holds the requested number of places', () => {
    expect(formatDecimal(1.8)).toBe('1.8');
    expect(formatDecimal(2, 2)).toBe('2.00');
  });
});

describe('formatPercentChange', () => {
  it('marks a gain and a loss', () => {
    expect(formatPercentChange(18.4)).toBe('+18%');
    expect(formatPercentChange(-4.2)).toBe('-4%');
  });
});

describe('formatPercent', () => {
  it('carries no sign', () => {
    expect(formatPercent(34.2)).toBe('34%');
  });
});

describe('formatKilograms', () => {
  it('converts grams to kilograms', () => {
    expect(formatKilograms(412_400)).toBe('412 kg');
  });
});

describe('formatClockTime', () => {
  it('maps hour zero to opening time', () => {
    expect(formatClockTime(0)).toBe('07:00');
  });

  it('maps the middle of the day', () => {
    expect(formatClockTime(8)).toBe('15:00');
  });

  it('pads nothing it does not need to', () => {
    expect(formatClockTime(14)).toBe('21:00');
  });
});

describe('formatReduction', () => {
  it('reads as a shelf edge label', () => {
    expect(formatReduction(0.25)).toBe('25% off');
  });
});

describe('roundToLabelPrice', () => {
  it('rounds to the nearest five pence', () => {
    expect(roundToLabelPrice(127)).toBe(125);
    expect(roundToLabelPrice(128)).toBe(130);
  });

  it('never prints less than five pence', () => {
    expect(roundToLabelPrice(1)).toBe(5);
    expect(roundToLabelPrice(0)).toBe(5);
  });

  it('leaves an already printable price alone', () => {
    expect(roundToLabelPrice(250)).toBe(250);
  });
});
