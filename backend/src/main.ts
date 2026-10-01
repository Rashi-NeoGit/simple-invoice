import 'reflect-metadata';
import compression from 'compression';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(compression());
  app.enableCors();

  // Applied app-wide (not just /invoices) so every endpoint gets the same
  // structured { statusCode, message, error } validation error shape.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // Run pending migrations on boot so `docker compose up` is a true
  // single-command bring-up without a separate manual migration step.
  await app.get(DataSource).runMigrations();

  const config = new DocumentBuilder()
    .setTitle('SimpleInvoice API')
    .setDescription('Invoice management API for the SimpleInvoice assessment')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`SimpleInvoice API listening on port ${port}`);
}

bootstrap();
