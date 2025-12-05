import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.service';
import { PrismaModule } from '../common/database/prisma.module';
import { VendorModule } from '../vendor/vendor.module';
import { ProductModule } from '../product/product.module';
import { AuthModule } from '../auth/auth.module';
import { CustomerModule } from '../customer/customer.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    VendorModule,
    ProductModule,
    AuthModule,
    CustomerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
