import { fireEvent, render, screen } from '@testing-library/react';
import { ASSUMPTION_RANGES, DEFAULT_ASSUMPTIONS } from '@secondshelf/domain';
import type { Assumptions } from '@secondshelf/engine';
import { describe, expect, it, vi } from 'vitest';
import { AssumptionsBar } from './AssumptionsBar';

const renderBar = (
  onChange: (next: Assumptions) => void,
  recoveredPence: number | null = 480_000,
): void => {
  render(
    <AssumptionsBar
      assumptions={DEFAULT_ASSUMPTIONS}
      recoveredPence={recoveredPence}
      pending={false}
      error={null}
      onChange={onChange}
    />,
  );
};

describe('AssumptionsBar', () => {
  it('labels each control with its current value in the reader units', () => {
    renderBar(vi.fn());

    expect(screen.getByText('1.8 times')).toBeTruthy();
    expect(screen.getByText('£0.40')).toBeTruthy();
    expect(screen.getByText('£0.12')).toBeTruthy();
  });

  it('gives each slider the permitted range from the domain', () => {
    renderBar(vi.fn());

    const slider = screen.getByLabelText('Price sensitivity');
    expect(slider.getAttribute('min')).toBe(String(ASSUMPTION_RANGES.priceSensitivity.min));
    expect(slider.getAttribute('max')).toBe(String(ASSUMPTION_RANGES.priceSensitivity.max));
    expect(slider.getAttribute('step')).toBe(String(ASSUMPTION_RANGES.priceSensitivity.step));
    expect(slider.getAttribute('aria-valuetext')).toBe('1.8 times');
  });

  it('reports one changed assumption and leaves the rest alone', () => {
    const onChange = vi.fn();
    renderBar(onChange);

    fireEvent.change(screen.getByLabelText('Staff time per markdown'), {
      target: { value: '75' },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_ASSUMPTIONS,
      staffCostPerEventPence: 75,
    });
  });

  it('shows the live total once a run has landed', () => {
    renderBar(vi.fn());

    expect(screen.getByText('£4,800')).toBeTruthy();
  });

  it('says it is working before the first run lands', () => {
    renderBar(vi.fn(), null);

    expect(screen.getByText('Working')).toBeTruthy();
  });
});
