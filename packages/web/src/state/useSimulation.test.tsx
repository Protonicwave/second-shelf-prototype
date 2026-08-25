import { act, renderHook, waitFor } from '@testing-library/react';
import { DEFAULT_ASSUMPTIONS, type Metrics, type RunResult } from '@secondshelf/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  SimulationMessage,
  SimulationRequest,
  SimulationWorker,
} from '../lib/worker/protocol';
import { useSimulation } from './useSimulation';

interface Stub {
  readonly worker: SimulationWorker;
  readonly requests: SimulationRequest[];
  reply(message: SimulationMessage): void;
  readonly terminated: () => boolean;
}

const createStub = (): Stub => {
  const requests: SimulationRequest[] = [];
  const listeners = new Set<(message: SimulationMessage) => void>();
  let terminated = false;

  return {
    requests,
    terminated: () => terminated,
    reply: (message) => {
      for (const listener of listeners) listener(message);
    },
    worker: {
      post: (request) => {
        requests.push(request);
      },
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      terminate: () => {
        terminated = true;
      },
    },
  };
};

const metricsFor = (valueRecoveredPence: number): Metrics => ({
  valueRecoveredPence,
  recoveredPercent: 18,
  marginRetainedPercent: 34,
  wasteAvoidedGrams: 412_000,
  carbonDioxideEquivalentKg: 1030,
  mealEquivalents: 865,
  unitsRecovered: 1204,
  markdownEvents: 480,
});

const runFor = (seed: number): RunResult =>
  ({ seed, dayCount: 30, days: [], lines: [] }) as unknown as RunResult;

describe('useSimulation', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts pending and posts one run for the default assumptions', async () => {
    const stub = createStub();
    const { result } = renderHook(() => useSimulation({ createWorker: () => stub.worker }));

    expect(result.current.pending).toBe(true);
    expect(result.current.metrics).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(stub.requests).toHaveLength(1);
    expect(stub.requests[0]?.assumptions).toEqual(DEFAULT_ASSUMPTIONS);
  });

  it('settles with the run and metrics the worker returns', async () => {
    const stub = createStub();
    const { result } = renderHook(() => useSimulation({ createWorker: () => stub.worker }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    const id = stub.requests[0]?.id ?? 0;
    act(() => {
      stub.reply({ kind: 'result', id, run: runFor(1), metrics: metricsFor(1000) });
    });

    await waitFor(() => {
      expect(result.current.pending).toBe(false);
    });
    expect(result.current.metrics?.valueRecoveredPence).toBe(1000);
    expect(result.current.error).toBeNull();
  });

  it('collapses rapid assumption changes into a single run', async () => {
    const stub = createStub();
    const { result } = renderHook(() => useSimulation({ createWorker: () => stub.worker }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(stub.requests).toHaveLength(1);

    act(() => {
      result.current.setAssumptions({ ...DEFAULT_ASSUMPTIONS, priceSensitivity: 2 });
    });
    act(() => {
      result.current.setAssumptions({ ...DEFAULT_ASSUMPTIONS, priceSensitivity: 2.4 });
    });
    act(() => {
      result.current.setAssumptions({ ...DEFAULT_ASSUMPTIONS, priceSensitivity: 2.8 });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(stub.requests).toHaveLength(2);
    expect(stub.requests[1]?.assumptions.priceSensitivity).toBe(2.8);
  });

  it('ignores a reply that a later run has already superseded', async () => {
    const stub = createStub();
    const { result } = renderHook(() => useSimulation({ createWorker: () => stub.worker }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    act(() => {
      stub.reply({ kind: 'result', id: 2, run: runFor(2), metrics: metricsFor(2000) });
    });
    act(() => {
      stub.reply({ kind: 'result', id: 1, run: runFor(1), metrics: metricsFor(1000) });
    });

    await waitFor(() => {
      expect(result.current.metrics?.valueRecoveredPence).toBe(2000);
    });
  });

  it('surfaces a worker failure as a readable error', async () => {
    const stub = createStub();
    const { result } = renderHook(() => useSimulation({ createWorker: () => stub.worker }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    const id = stub.requests[0]?.id ?? 0;
    act(() => {
      stub.reply({ kind: 'failure', id, message: 'Assumptions out of range: priceSensitivity' });
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Assumptions out of range: priceSensitivity');
    });
  });

  it('terminates the worker when the hook unmounts', async () => {
    const stub = createStub();
    const { unmount } = renderHook(() => useSimulation({ createWorker: () => stub.worker }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    unmount();

    expect(stub.terminated()).toBe(true);
  });
});
