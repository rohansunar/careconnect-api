import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.service';
import { PrismaModule } from '../common/database/prisma.module';
import { ProductModule } from 'src/product/product.module';
import { AuthModule } from 'src/auth/auth.module';
import { CustomerModule } from 'src/customer/customer.module';
import { SearchModule } from 'src/search/search.module';
import { OrderModule } from 'src/order/order.module';
import { PaymentModule } from 'src/payment/payment.module';
import { AddressModule } from 'src/address/address.module';
import { QueueModule } from 'src/queue/queue.module';
import { TokenModule } from '../token/token.module';
import { NotificationModule } from '../notification/notification.module';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CqrsModule } from '@nestjs/cqrs';
import { LedgerModule } from 'src/ledger/ledger.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CqrsModule,
    PrismaModule,
    LedgerModule,
    ProductModule,
    AuthModule,
    CustomerModule,
    SearchModule,
    ScheduleModule.forRoot(),
    OrderModule,
    PaymentModule,
    AddressModule,
    QueueModule,
    TokenModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}