import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

export type CreatedApp = {
  app: NestExpressApplication;
  express: Express;
};

export async function createKoridorApp(
  existingExpress?: Express,
): Promise<CreatedApp> {
  const expressApp = existingExpress ?? express();
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(expressApp),
    { bodyParser: true },
  );

  await configureApp(app);
  return { app, express: expressApp };
}

export async function configureApp(app: INestApplication): Promise<void> {
  const config = app.get(ConfigService);
  const prefix = config.getOrThrow<string>('api.prefix');

  app.setGlobalPrefix(prefix);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.getOrThrow<string[]>('cors.origins'),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Koridor API')
    .setDescription(
      'Koridor Phase 1 API — operating system for cross-border trade',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
