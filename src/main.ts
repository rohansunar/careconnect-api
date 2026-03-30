import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import multipart from '@fastify/multipart';
import fastifyCsrf from '@fastify/csrf-protection';

async function bootstrap() {
  const adapter = new FastifyAdapter({
    bodyLimit: 1048576 * 10, // example: 10MB
    // logger: true,
  });
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  app.enableCors({
    origin: 'http://localhost:5173',
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Multipart support for file uploads
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
      files: 10, // max 10 files
    },
  });
  /*
   * Cross-site request forgery (CSRF or XSRF) is a type of
   * attack where unauthorized commands are sent from a trusted user to a web application.
   */

  await app.register(fastifyCsrf);

  // Global validation pipe
  // Endpoint validation configuration
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

  // Swagger/OpenAPI Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Health API')
    .setDescription(
      `Comprehensive API for the Health Platform.
       This API provides endpoints for user authentication, Booking management,  and administrative functions.
       The platform supports customers and administrators with role-based access control.`,
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Auth')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  if (process.env.NODE_ENV === 'development') {
    fs.writeFileSync('./swagger.json', JSON.stringify(document, null, 2));
  }

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
  console.log(`Health API is running on: http://localhost:${process.env.PORT}`);
}

bootstrap();
