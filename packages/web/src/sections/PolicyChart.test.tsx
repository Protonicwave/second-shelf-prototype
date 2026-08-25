import { render, screen } from '@testing-library/react';
import {
  buildScenario,
  DEFAULT_ASSUMPTIONS,
  DEFAULT_DAY_COUNT,
  DEFAULT_SEED,
  runScenario,
} from '@secondshelf/domain';
import { describe, expect, it } from 'vitest';
import { formatPounds } from '../lib/format';
import { PolicyChart } from './PolicyChart';

const run = runScenario(buildScenario(DEFAULT_SEED, DEFAULT_DAY_COUNT), DEFAULT_ASSUMPTIONS);

describe('PolicyChart', () => {
  it('describes the actual result of the run it was given', () => {
    render(<PolicyChart days={run.days} />);
    const last = run.days[run.days.length - 1];

    const description = screen.getByRole('img').getAttribute('aria-label') ?? '';
    expect(description).toContain(`${DEFAULT_DAY_COUNT} trading days`);
    expect(description).toContain(formatPounds(last?.enginePence ?? 0));
    expect(description).toContain(formatPounds(last?.currentPence ?? 0));
  });

  it('says it is working rather than drawing an empty chart', () => {
    render(<PolicyChart days={[]} />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText(/Working out/)).toBeTruthy();
  });
});
