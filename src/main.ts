import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

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

  const corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin) {
    app.enableCors({
      origin: corsOrigin.split(',').map((o) => o.trim()),
      credentials: true,
    });
  } else if (process.env.NODE_ENV !== 'production') {
    app.enableCors({ origin: true, credentials: true });
  }

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
