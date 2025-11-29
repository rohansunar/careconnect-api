import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';

async function bootstrap() {
  const adapter = new FastifyAdapter({
    bodyLimit: 1048576 * 10, // example: 10MB
    // logger: true,
  });
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );
  // Global validation pipe
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
    .setTitle('Water Jar Delivery Platform API')
    .setDescription(
      'Comprehensive API for the Water Jar Delivery Platform. This API provides endpoints for user authentication, order management, delivery tracking, vendor operations, and administrative functions. The platform supports customers, vendors, delivery riders, and administrators with role-based access control.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Vendors', 'Vendor operations and product management')
    .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    fs.writeFileSync('./swagger.json', JSON.stringify(document, null, 2));

  await app.listen(process.env.PORT ?? 3000);
  console.log(
    `Water Jar Delivery API is running on: http://localhost:${process.env.PORT}`,
  );
}

bootstrap();
