import { render, screen } from '@testing-library/react';
import {
  buildScenario,
  DEFAULT_ASSUMPTIONS,
  DEFAULT_DAY_COUNT,
  DEFAULT_SEED,
  deriveMetrics,
  runScenario,
} from '@secondshelf/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatInteger, formatKilograms, formatPercent, formatPounds } from '../lib/format';
import { Figures } from './Figures';

const reducedMotion = (matches: boolean): void => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
};

describe('Figures', () => {
  beforeEach(() => {
    reducedMotion(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the domain metrics for the default seed', () => {
    const run = runScenario(buildScenario(DEFAULT_SEED, DEFAULT_DAY_COUNT), DEFAULT_ASSUMPTIONS);
    const metrics = deriveMetrics(run);

    render(<Figures metrics={metrics} />);

    expect(screen.getAllByText(formatPounds(metrics.valueRecoveredPence))).not.toHaveLength(0);
    expect(screen.getAllByText(formatKilograms(metrics.wasteAvoidedGrams))).not.toHaveLength(0);
    expect(screen.getAllByText(formatPercent(metrics.marginRetainedPercent, 1))).not.toHaveLength(
      0,
    );
    expect(screen.getAllByText(formatInteger(metrics.unitsRecovered))).not.toHaveLength(0);
  });

  it('holds the figures at zero until the first run lands', () => {
    render(<Figures metrics={null} />);

    expect(screen.getAllByText(formatPounds(0))).not.toHaveLength(0);
    expect(screen.getAllByText('0 kg')).not.toHaveLength(0);
  });
});
