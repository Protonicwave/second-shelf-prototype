import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_ASSUMPTIONS,
  DEFAULT_DAY_COUNT,
  DEFAULT_SEED,
  type Metrics,
  type RunResult,
} from '@secondshelf/domain';
import type { Assumptions } from '@secondshelf/engine';
import { createSimulationWorker } from '../lib/worker/createSimulationWorker';
import { SIMULATION_DEBOUNCE_MS, type SimulationWorker } from '../lib/worker/protocol';

/** Everything a section needs to render, plus the one control it can turn. */
export interface Simulation {
  readonly assumptions: Assumptions;
  readonly run: RunResult | null;
  readonly metrics: Metrics | null;
  /** True while a run is queued or in flight, so figures can be held steady. */
  readonly pending: boolean;
  readonly error: string | null;
  readonly setAssumptions: (next: Assumptions) => void;
}

interface UseSimulationOptions {
  readonly createWorker?: () => SimulationWorker;
  readonly seed?: number;
  readonly dayCount?: number;
}

/**
 * Returns the current scenario for a set of assumptions, recomputed off the main
 * thread whenever they change. This is the only place the page talks to the
 * domain, so there is one run in flight and one source of numbers.
 */
export const useSimulation = (options: UseSimulationOptions = {}): Simulation => {
  const {
    createWorker = createSimulationWorker,
    seed = DEFAULT_SEED,
    dayCount = DEFAULT_DAY_COUNT,
  } = options;

  const [assumptions, setAssumptionsState] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const [run, setRun] = useState<RunResult | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);

  const workerRef = useRef<SimulationWorker | null>(null);
  const requestIdRef = useRef(0);
  const settledIdRef = useRef(0);

  useEffect(() => {
    const worker = createWorker();
    workerRef.current = worker;

    const unsubscribe = worker.subscribe((message) => {
      if (message.id < settledIdRef.current) return;
      settledIdRef.current = message.id;
      if (message.kind === 'failure') {
        setError(message.message);
      } else {
        setError(null);
        setRun(message.run);
        setMetrics(message.metrics);
      }
      if (message.id === requestIdRef.current) setPending(false);
    });

    return () => {
      unsubscribe();
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const worker = workerRef.current;
    if (worker === null) return;

    setPending(true);
    const id = requestIdRef.current + 1;
    requestIdRef.current = id;

    const timer = setTimeout(() => {
      worker.post({ id, seed, dayCount, assumptions });
    }, SIMULATION_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [assumptions, seed, dayCount]);

  const setAssumptions = useCallback((next: Assumptions): void => {
    setAssumptionsState(next);
  }, []);

  return useMemo(
    () => ({ assumptions, run, metrics, pending, error, setAssumptions }),
    [assumptions, run, metrics, pending, error, setAssumptions],
  );
};
