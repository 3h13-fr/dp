import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from monorepo root (when running from apps/api)
config({ path: resolve(process.cwd(), '../../.env') });
config({ path: resolve(process.cwd(), '.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.useWebSocketAdapter(new IoAdapter(app));
  // Stripe webhook needs raw body for signature verification; other routes need JSON
  app.use(express.raw({ type: 'application/json', limit: '1mb' }));
  app.use((req: express.Request & { body: Buffer | Record<string, unknown> }, _res: express.Response, next: express.NextFunction) => {
    if (req.originalUrl !== '/payments/webhook' && Buffer.isBuffer(req.body)) {
      try {
        req.body = JSON.parse(req.body.toString());
      } catch {
        req.body = {};
      }
    }
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });
  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}
bootstrap();
