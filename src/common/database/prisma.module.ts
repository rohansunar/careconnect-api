import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() decorator makes the module global, so you don't need to import it in other modules.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
