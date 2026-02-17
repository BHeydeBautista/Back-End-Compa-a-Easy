import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

function parseOrigins(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const allowedOrigins = new Set<string>([
    ...parseOrigins(process.env.CORS_ORIGIN),
    ...parseOrigins(process.env.FRONTEND_URL),
    ...parseOrigins(process.env.NEXT_PUBLIC_FRONTEND_URL),
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]);

  app.enableCors({
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const isProd = process.env.NODE_ENV === 'production';
      const isAllowed = allowedOrigins.has(origin);

      if (isAllowed) return callback(null, true);
      if (!isProd) return callback(null, true);

      return callback(new Error('Not allowed by CORS'));
    },
  });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
