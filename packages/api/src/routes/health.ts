import type { FastifyInstance } from 'fastify';
import { SERVICE_VERSION } from '../version.js';

/** Adds the liveness route, which reports the running version and uptime. */
export const registerHealthRoutes = (app: FastifyInstance): void => {
  app.get(
    '/health',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            required: ['status', 'version', 'uptimeSeconds'],
            properties: {
              status: { type: 'string' },
              version: { type: 'string' },
              uptimeSeconds: { type: 'integer' },
            },
          },
        },
      },
    },
    () => ({
      status: 'ok',
      version: SERVICE_VERSION,
      uptimeSeconds: Math.round(process.uptime()),
    }),
  );
};
