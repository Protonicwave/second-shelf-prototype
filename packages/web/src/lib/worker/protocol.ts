import type { Assumptions } from '@secondshelf/engine';
import type { Metrics, RunResult } from '@secondshelf/domain';

/** How long slider input settles before a run is posted to the worker. */
export const SIMULATION_DEBOUNCE_MS = 90;

/** One request for a full scenario, tagged so late replies can be discarded. */
export interface SimulationRequest {
  readonly id: number;
  readonly seed: number;
  readonly dayCount: number;
  readonly assumptions: Assumptions;
}

/** A completed run and the headline figures derived from it. */
export interface SimulationResult {
  readonly kind: 'result';
  readonly id: number;
  readonly run: RunResult;
  readonly metrics: Metrics;
}

/** A run the worker refused or could not finish, carrying a readable reason. */
export interface SimulationFailure {
  readonly kind: 'failure';
  readonly id: number;
  readonly message: string;
}

export type SimulationMessage = SimulationResult | SimulationFailure;

/**
 * The narrow view of a worker the application depends on, so the hook can be
 * driven by a stub in tests without a real thread.
 */
export interface SimulationWorker {
  post(request: SimulationRequest): void;
  subscribe(listener: (message: SimulationMessage) => void): () => void;
  terminate(): void;
}
