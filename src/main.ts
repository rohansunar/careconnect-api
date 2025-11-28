import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

async function bootstrap() {
  const adapter = new FastifyAdapter({
    bodyLimit: 1048576 * 10, // example: 10MB
    // logger: true,
  });
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );
  await app.listen(process.env.PORT ?? 3000);
  console.log(
    `Water Jar Delivery API is running on: http://localhost:${process.env.PORT}`,
  );
}

bootstrap();
