import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { Metrics } from '@secondshelf/domain';
import { Chip, Figure } from '../components/primitives';
import {
  formatInteger,
  formatKilograms,
  formatPercent,
  formatPercentChange,
  formatPounds,
} from '../lib/format';
import './sections.css';

/** How long the figures take to count up the first time they arrive. */
const COUNT_UP_MS = 900;

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Returns how far the one and only count up has run, from zero to one. It fires
 * when the first run lands and never again, so changing an assumption moves the
 * figures straight to their new value rather than replaying the animation.
 */
const useCountUpProgress = (ready: boolean): number => {
  const [progress, setProgress] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;

    if (prefersReducedMotion()) {
      setProgress(1);
      return;
    }

    let frame = 0;
    let startedAt: number | null = null;
    const step = (now: number): void => {
      startedAt ??= now;
      const elapsed = Math.min(1, (now - startedAt) / COUNT_UP_MS);
      setProgress(1 - Math.pow(1 - elapsed, 3));
      if (elapsed < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [ready]);

  return progress;
};

interface FiguresProps {
  readonly metrics: Metrics | null;
}

/** The four headline numbers, taken straight from the run behind the page. */
export const Figures = ({ metrics }: FiguresProps): ReactElement => {
  const progress = useCountUpProgress(metrics !== null);
  const scale = (value: number): number => value * progress;

  return (
    <section className="wrap">
      <div className="figures">
        <Figure
          label="Revenue recovered"
          value={formatPounds(scale(metrics?.valueRecoveredPence ?? 0))}
        >
          <Chip>{formatPercentChange(metrics?.recoveredPercent ?? 0)}</Chip> against the store&#39;s
          current policy
        </Figure>
        <Figure
          label="Waste avoided"
          value={formatKilograms(scale(metrics?.wasteAvoidedGrams ?? 0))}
        >
          {formatInteger(metrics?.carbonDioxideEquivalentKg ?? 0)} kg CO&#8322;e, roughly{' '}
          {formatInteger(metrics?.mealEquivalents ?? 0)} meals
        </Figure>
        <Figure
          label="Margin retained"
          value={formatPercent(scale(metrics?.marginRetainedPercent ?? 0), 1)}
        >
          Reducing early costs less than reducing deep
        </Figure>
        <Figure label="Sold, not binned" value={formatInteger(scale(metrics?.unitsRecovered ?? 0))}>
          Extra units, across {formatInteger(metrics?.markdownEvents ?? 0)} markdown decisions
        </Figure>
      </div>
    </section>
  );
};
