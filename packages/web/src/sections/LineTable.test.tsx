import { fireEvent, render, screen, within } from '@testing-library/react';
import {
  buildScenario,
  CATALOGUE,
  DEFAULT_ASSUMPTIONS,
  DEFAULT_DAY_COUNT,
  DEFAULT_SEED,
  runScenario,
} from '@secondshelf/domain';
import { describe, expect, it } from 'vitest';
import { LineTable } from './LineTable';

const run = runScenario(buildScenario(DEFAULT_SEED, DEFAULT_DAY_COUNT), DEFAULT_ASSUMPTIONS);

const renderTable = (): void => {
  render(<LineTable lines={run.lines} dayCount={run.dayCount} />);
};

const firstColumnValues = (): readonly string[] =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]?.textContent ?? '');

const priceColumnValues = (): readonly number[] =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      Number((within(row).getAllByRole('cell')[4]?.textContent ?? '').replace(/[^0-9.]/g, '')),
    );

const isSorted = (values: readonly number[], direction: 'ascending' | 'descending'): boolean =>
  values.every((value, index) => {
    const previous = values[index - 1];
    if (previous === undefined) return true;
    return direction === 'ascending' ? previous <= value : previous >= value;
  });

describe('LineTable', () => {
  it('renders every line in the catalogue', () => {
    renderTable();

    expect(firstColumnValues()).toHaveLength(CATALOGUE.length);
  });

  it('opens sorted by the value the engine recovers, highest first', () => {
    renderTable();

    const header = screen.getByRole('columnheader', { name: /Recovered per day/ });
    expect(header.getAttribute('aria-sort')).toBe('descending');

    const expected = [...run.lines]
      .sort((a, b) => b.netValueRecoveredPence - a.netValueRecoveredPence)
      .map((line) => line.name);
    expect(firstColumnValues()).toEqual(expected);
  });

  it('sorts by a column when its header is activated', () => {
    renderTable();

    fireEvent.click(screen.getByRole('button', { name: /Line/ }));

    const names = firstColumnValues();
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en-GB')));
    expect(screen.getByRole('columnheader', { name: /Line/ }).getAttribute('aria-sort')).toBe(
      'ascending',
    );
  });

  it('reverses the order when the same header is activated again', () => {
    renderTable();

    const button = screen.getByRole('button', { name: /Full price/ });
    fireEvent.click(button);
    expect(isSorted(priceColumnValues(), 'descending')).toBe(true);

    fireEvent.click(button);
    expect(isSorted(priceColumnValues(), 'ascending')).toBe(true);
    expect(screen.getByRole('columnheader', { name: /Full price/ }).getAttribute('aria-sort')).toBe(
      'ascending',
    );
  });
});
