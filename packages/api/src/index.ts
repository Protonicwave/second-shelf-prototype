import { createServer } from './server.js';

const port = Number(process.env['PORT'] ?? 3000);
const host = process.env['HOST'] ?? '0.0.0.0';
const corsOrigins = (process.env['CORS_ORIGIN'] ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const service = await createServer({
  databaseFile: process.env['DATABASE_FILE'] ?? 'decisions.db',
  corsOrigins,
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    service.app.close().then(
      () => {
        process.exit(0);
      },
      () => {
        process.exit(1);
      },
    );
  });
}

await service.app.listen({ port, host });
