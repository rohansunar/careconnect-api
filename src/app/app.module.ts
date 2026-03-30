import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.service';
import { PrismaModule } from '../common/database/prisma.module';
import { ProductModule } from 'src/product/product.module';
import { AuthModule } from 'src/auth/auth.module';
import { UserModule } from 'src/user/user.module';
import { SearchModule } from 'src/search/search.module';
import { PaymentModule } from 'src/payment/payment.module';
import { AddressModule } from 'src/address/address.module';
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
    UserModule,
    SearchModule,
    ScheduleModule.forRoot(),
    PaymentModule,
    AddressModule,
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