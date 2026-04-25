import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = process.env.PORT || 3000;

  // Bloquear MOCK_PRISMA em produção
  if (process.env.NODE_ENV === 'production' && process.env.MOCK_PRISMA === 'true') {
    throw new Error('MOCK_PRISMA cannot be enabled in production — aborting');
  }

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST'],
  });

  // Limitar body GraphQL
  app.use('/graphql', express.json({ limit: '100kb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(port, '0.0.0.0');
}
bootstrap();
