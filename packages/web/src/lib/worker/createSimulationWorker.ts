import type { SimulationMessage, SimulationRequest, SimulationWorker } from './protocol';

/**
 * Returns a simulation worker backed by a real thread, so the scenario never
 * runs on the main thread and slider input never blocks paint.
 */
export const createSimulationWorker = (): SimulationWorker => {
  const worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), {
    type: 'module',
  });

  return {
    post: (request: SimulationRequest): void => {
      worker.postMessage(request);
    },
    subscribe: (listener: (message: SimulationMessage) => void): (() => void) => {
      const handler = (event: MessageEvent<SimulationMessage>): void => {
        listener(event.data);
      };
      worker.addEventListener('message', handler);
      return (): void => {
        worker.removeEventListener('message', handler);
      };
    },
    terminate: (): void => {
      worker.terminate();
    },
  };
};
