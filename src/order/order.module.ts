import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../common/database/prisma.module';
import { CartModule } from '../cart/cart.module';
import { PaymentModule } from '../payment/payment.module';
import { NotificationModule } from '../notification/notification.module';
import { QueueModule } from '../queue/queue.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { OtpModule } from '../otp/otp.module';
import { OrderService } from './services/order.service';
import { CustomerOrderController } from './controllers/customer-order.controller';
import { VendorOrderController } from './controllers/vendor-order.controller';
import { AdminOrderController } from './controllers/admin-order.controller';
import { RiderOrderController } from './controllers/rider-order.controller';
import { CustomerOrderService } from './services/customer-order.service';
import { VendorOrderService } from './services/vendor-order.service';
import { AdminOrderService } from './services/admin-order.service';
import { RiderOrderService } from './services/rider-order.service';
import { OrderGenerationService } from './services/order-generation.service';
import { OrderNumberService } from './services/order-number.service';
import { OrderGenerationProcessor } from '../queue/processors/order-generation.processor';
import { OnPaymentSucceededOrderHandler } from './services/handlers/on-payment-succeeded-order.handler';
import { CqrsModule } from '@nestjs/cqrs';

@Module({
  imports: [
    CqrsModule,
    PrismaModule,
    CartModule,
    PaymentModule,
    NotificationModule,
    ScheduleModule.forRoot(),
    QueueModule,
    SubscriptionModule,
    OtpModule,
  ],
  controllers: [
    CustomerOrderController,
    VendorOrderController,
    AdminOrderController,
    RiderOrderController,
  ],
  providers: [
    OrderService,
    CustomerOrderService,
    VendorOrderService,
    AdminOrderService,
    RiderOrderService,
    OrderGenerationService,
    OrderNumberService,
    OrderGenerationProcessor,
    OnPaymentSucceededOrderHandler,
  ],
  exports: [
    OrderService,
    CustomerOrderService,
    VendorOrderService,
    AdminOrderService,
    RiderOrderService,
  ],
})
export class OrderModule {}
