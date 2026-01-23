import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.service';
import { PrismaModule } from '../common/database/prisma.module';
import { VendorModule } from 'src/vendor/vendor.module';
import { ProductModule } from 'src/product/product.module';
import { AuthModule } from 'src/auth/auth.module';
import { CustomerModule } from 'src/customer/customer.module';
import { SearchModule } from 'src/search/search.module';
import { CartModule } from 'src/cart/cart.module';
import { OrderModule } from 'src/order/order.module';
import { PaymentModule } from 'src/payment/payment.module';
import { RiderModule } from 'src/rider/rider.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { AddressModule } from 'src/address/address.module';
import { LocationModule } from 'src/location/location.module';

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
    SearchModule,
    CartModule,
    OrderModule,
    PaymentModule,
    RiderModule,
    SubscriptionModule,
    AddressModule,
    LocationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
