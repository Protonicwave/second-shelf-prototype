import {
  deriveMetrics,
  buildScenario,
  outOfRangeAssumptions,
  runScenario,
} from '@secondshelf/domain';
import type { SimulationMessage, SimulationRequest } from './protocol';

interface WorkerScope {
  onmessage: ((event: MessageEvent<SimulationRequest>) => void) | null;
  postMessage(message: SimulationMessage): void;
}

const scope = self as unknown as WorkerScope;

let pending: SimulationRequest | null = null;
let scheduled = false;

const respond = (): void => {
  scheduled = false;
  const request = pending;
  pending = null;
  if (request === null) return;

  const bad = outOfRangeAssumptions(request.assumptions);
  if (bad.length > 0) {
    scope.postMessage({
      kind: 'failure',
      id: request.id,
      message: `Assumptions out of range: ${bad.join(', ')}`,
    });
    return;
  }

  const scenario = buildScenario(request.seed, request.dayCount);
  const run = runScenario(scenario, request.assumptions);
  scope.postMessage({ kind: 'result', id: request.id, run, metrics: deriveMetrics(run) });
};

/*
 * Requests are parked rather than run on arrival. Anything that lands while the
 * previous request is still queued replaces it, so a slider drag produces one
 * run at the value the colleague settled on rather than one run per frame.
 */
scope.onmessage = (event: MessageEvent<SimulationRequest>): void => {
  pending = event.data;
  if (scheduled) return;
  scheduled = true;
  setTimeout(respond, 0);
};
