import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import { openDecisionStore, type DecisionStore } from './db/index.js';
import { ServiceError } from './errors.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerOverrideRoutes } from './routes/overrides.js';
import { registerRecommendationRoutes } from './routes/recommendations.js';
import { registerRunRoutes } from './routes/run.js';

/** How the service is wired for one process or one test. */
export interface ServerOptions {
  /** SQLite file path, or ':memory:' for a database that dies with the process. */
  readonly databaseFile: string;
  readonly logger: boolean;
  readonly corsOrigins: readonly string[];
  /** Requests allowed from one address per minute. */
  readonly rateLimitMax: number;
}

const DEFAULTS: ServerOptions = Object.freeze({
  databaseFile: 'decisions.db',
  logger: true,
  corsOrigins: Object.freeze(['http://localhost:5173']),
  rateLimitMax: 120,
});

/** A running Fastify instance together with the log it writes to. */
export interface Service {
  readonly app: FastifyInstance;
  readonly store: DecisionStore;
}

/**
 * Returns a service ready to accept requests, with validation, rate limiting,
 * CORS and the decision log already wired. The caller decides whether to listen
 * on a port or to inject requests directly.
 */
export const createServer = async (options: Partial<ServerOptions> = {}): Promise<Service> => {
  const settings: ServerOptions = { ...DEFAULTS, ...options };
  const store = openDecisionStore(settings.databaseFile);
  const app = Fastify({ logger: settings.logger });

  await app.register(cors, { origin: [...settings.corsOrigins], methods: ['GET', 'POST'] });
  await app.register(rateLimit, { max: settings.rateLimitMax, timeWindow: '1 minute' });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof ServiceError) {
      void reply.status(error.statusCode).send({ error: error.errorCode, message: error.message });
      return;
    }
    if (error.validation !== undefined) {
      void reply.status(400).send({ error: 'invalid_request', message: error.message });
      return;
    }
    const status = error.statusCode ?? 500;
    if (status >= 500) request.log.error({ err: error }, 'request failed');
    void reply.status(status).send({
      error: status === 429 ? 'rate_limited' : 'internal_error',
      message: status >= 500 ? 'The request could not be completed' : error.message,
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    void reply.status(404).send({ error: 'not_found', message: 'No such route' });
  });

  registerHealthRoutes(app);
  registerRunRoutes(app);
  registerRecommendationRoutes(app, store);
  registerOverrideRoutes(app, store);

  app.addHook('onClose', () => {
    store.close();
  });

  await app.ready();
  return { app, store };
};
