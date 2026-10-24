import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/db';

async function start() {
  // Attempt MongoDB connection — non-fatal; endpoints will fail safely if not connected
  await connectDatabase();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`🛡️  RakshaSphere Backend API running in [${env.NODE_ENV}] mode on port ${env.PORT}`);
    console.log(`   Health check: http://localhost:${env.PORT}/health`);
    console.log(`   Incidents API: http://localhost:${env.PORT}/api/v1/incidents`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received: closing HTTP server`);
    server.close(async () => {
      await disconnectDatabase();
      console.log('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

start().catch((err) => {
  console.error('Fatal startup error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
