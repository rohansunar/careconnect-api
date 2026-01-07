import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/database/prisma.module';
import { CartModule } from '../cart/cart.module';
import { PaymentModule } from '../payment/payment.module';
import { NotificationModule } from '../notification/notification.module';
import { OrderService } from './services/order.service';
import { CustomerOrderController } from './controllers/customer-order.controller';
import { VendorOrderController } from './controllers/vendor-order.controller';
import { AdminOrderController } from './controllers/admin-order.controller';
import { RiderOrderController } from './controllers/rider-order.controller';
import { CustomerOrderService } from './services/customer-order.service';
import { VendorOrderService } from './services/vendor-order.service';
import { AdminOrderService } from './services/admin-order.service';
import { RiderOrderService } from './services/rider-order.service';

@Module({
  imports: [PrismaModule, CartModule, PaymentModule, NotificationModule],
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
