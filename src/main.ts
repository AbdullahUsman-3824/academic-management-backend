import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import 'dotenv/config';

type CorsOriginCallback = (err: Error | null, allow?: boolean) => void;

const logger = new Logger('Bootstrap');

async function bootstrap() {
  // --- Fail fast: don't let the app boot with broken CORS config ---
  const rawOrigins = process.env.CORS_ORIGIN;

  if (!rawOrigins || rawOrigins.trim() === '') {
    throw new Error(
      'CORS_ORIGIN env var is missing or empty. Set it to a comma-separated list of allowed origins (e.g. https://myapp.com,https://admin.myapp.com)',
    );
  }

  const corsOrigins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    // normalize: strip trailing slash so "https://x.com/" and "https://x.com" both work
    .map((origin) => origin.replace(/\/$/, ''));

  if (corsOrigins.length === 0) {
    throw new Error(
      'CORS_ORIGIN resolved to an empty list after parsing. Check the env var value.',
    );
  }

  // Warn (don't silently fail) on obviously malformed entries
  for (const origin of corsOrigins) {
    if (!/^https?:\/\//.test(origin)) {
      logger.warn(
        `CORS_ORIGIN entry "${origin}" is missing a protocol (http:// or https://) — it will never match a browser's Origin header.`,
      );
    }
  }

  logger.log(`CORS allowed origins: ${corsOrigins.join(', ')}`);

  const isProduction = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: (
      requestOrigin: string | undefined,
      callback: CorsOriginCallback,
    ): void => {
      // No Origin header at all (Postman, curl, server-to-server).
      // Allowed in development for easier testing, blocked in production.
      if (!requestOrigin) {
        if (!isProduction) {
          callback(null, true);
        } else {
          callback(
            new Error('CORS: request has no Origin header, rejected'),
            false,
          );
        }
        return;
      }

      const normalizedRequestOrigin = requestOrigin.replace(/\/$/, '');

      if (corsOrigins.includes(normalizedRequestOrigin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS: blocked request from origin "${requestOrigin}"`);
        callback(
          new Error(`CORS: origin "${requestOrigin}" not allowed`),
          false,
        );
      }
    },
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}

void bootstrap();
