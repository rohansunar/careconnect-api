import { PrismaClient, Prisma } from '@prisma/client';

describe('Schema Integrity', () => {
  it('should instantiate PrismaClient without errors', () => {
    expect(() => {
      const prisma = new PrismaClient();
    }).not.toThrow();
  });

  it('should have all models defined', () => {
    const prisma = new PrismaClient();
    expect(prisma.customer).toBeDefined();
    expect(prisma.vendor).toBeDefined();
    expect(prisma.vendorProduct).toBeDefined();
    expect(prisma.subscription).toBeDefined();
    expect(prisma.order).toBeDefined();
    expect(prisma.monthlyBill).toBeDefined();
    expect(prisma.payment).toBeDefined();
    expect(prisma.paymentLink).toBeDefined();
    expect(prisma.notification).toBeDefined();
  });
});

describe('Model Relationships', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  it('VendorProduct should have vendor relation and foreign key', () => {
    expect(prisma.vendorProduct.fields.vendor_id).toBeDefined();
    expect(prisma.vendorProduct.fields.vendor).toBeDefined();
  });

  it('Subscription should have customer, vendor, and product relations', () => {
    expect(prisma.subscription.fields.customer_id).toBeDefined();
    expect(prisma.subscription.fields.customer).toBeDefined();
    expect(prisma.subscription.fields.vendor_id).toBeDefined();
    expect(prisma.subscription.fields.vendor).toBeDefined();
    expect(prisma.subscription.fields.product_id).toBeDefined();
    expect(prisma.subscription.fields.product).toBeDefined();
  });

  it('Order should have customer, vendor, and product relations', () => {
    expect(prisma.order.fields.customer_id).toBeDefined();
    expect(prisma.order.fields.customer).toBeDefined();
    expect(prisma.order.fields.vendor_id).toBeDefined();
    expect(prisma.order.fields.vendor).toBeDefined();
    expect(prisma.order.fields.product_id).toBeDefined();
    expect(prisma.order.fields.product).toBeDefined();
  });

  it('MonthlyBill should have customer and vendor relations', () => {
    expect(prisma.monthlyBill.fields.customer_id).toBeDefined();
    expect(prisma.monthlyBill.fields.customer).toBeDefined();
    expect(prisma.monthlyBill.fields.vendor_id).toBeDefined();
    expect(prisma.monthlyBill.fields.vendor).toBeDefined();
  });

  it('Payment should have bill, order, customer, and vendor relations', () => {
    expect(prisma.payment.fields.bill_id).toBeDefined();
    expect(prisma.payment.fields.bill).toBeDefined();
    expect(prisma.payment.fields.order_id).toBeDefined();
    expect(prisma.payment.fields.order).toBeDefined();
    expect(prisma.payment.fields.customer_id).toBeDefined();
    expect(prisma.payment.fields.customer).toBeDefined();
    expect(prisma.payment.fields.vendor_id).toBeDefined();
    expect(prisma.payment.fields.vendor).toBeDefined();
  });

  it('PaymentLink should have bill relation and foreign key', () => {
    expect(prisma.paymentLink.fields.bill_id).toBeDefined();
    expect(prisma.paymentLink.fields.bill).toBeDefined();
  });

  it('Notification should have customer and vendor relations', () => {
    expect(prisma.notification.fields.customer_id).toBeDefined();
    expect(prisma.notification.fields.customer).toBeDefined();
    expect(prisma.notification.fields.vendor_id).toBeDefined();
    expect(prisma.notification.fields.vendor).toBeDefined();
  });

  it('Customer should have relations to subscriptions, orders, monthly_bills, payments, notifications', () => {
    expect(prisma.customer.fields.subscriptions).toBeDefined();
    expect(prisma.customer.fields.orders).toBeDefined();
    expect(prisma.customer.fields.monthly_bills).toBeDefined();
    expect(prisma.customer.fields.payments).toBeDefined();
    expect(prisma.customer.fields.notifications).toBeDefined();
  });

  it('Vendor should have relations to vendor_products, subscriptions, orders, monthly_bills, payments, notifications', () => {
    expect(prisma.vendor.fields.vendor_products).toBeDefined();
    expect(prisma.vendor.fields.subscriptions).toBeDefined();
    expect(prisma.vendor.fields.orders).toBeDefined();
    expect(prisma.vendor.fields.monthly_bills).toBeDefined();
    expect(prisma.vendor.fields.payments).toBeDefined();
    expect(prisma.vendor.fields.notifications).toBeDefined();
  });

  it('VendorProduct should have relations to subscriptions and orders', () => {
    expect(prisma.vendorProduct.fields.subscriptions).toBeDefined();
    expect(prisma.vendorProduct.fields.orders).toBeDefined();
  });

  it('Order should have relation to payments', () => {
    expect(prisma.order.fields.payments).toBeDefined();
  });

  it('MonthlyBill should have relations to payments and payment_links', () => {
    expect(prisma.monthlyBill.fields.payments).toBeDefined();
    expect(prisma.monthlyBill.fields.payment_links).toBeDefined();
  });
});

describe('Field Validations', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  it('Customer should have required fields: id, name, phone', () => {
    expect(prisma.customer.fields.id).toBeDefined();
    expect(prisma.customer.fields.name).toBeDefined();
    expect(prisma.customer.fields.phone).toBeDefined();
  });

  it('Vendor should have required fields: id, name, phone, city', () => {
    expect(prisma.vendor.fields.id).toBeDefined();
    expect(prisma.vendor.fields.name).toBeDefined();
    expect(prisma.vendor.fields.phone).toBeDefined();
    expect(prisma.vendor.fields.city).toBeDefined();
  });

  it('VendorProduct should have required fields: id, vendor_id, name, price', () => {
    expect(prisma.vendorProduct.fields.id).toBeDefined();
    expect(prisma.vendorProduct.fields.vendor_id).toBeDefined();
    expect(prisma.vendorProduct.fields.name).toBeDefined();
    expect(prisma.vendorProduct.fields.price).toBeDefined();
  });

  it('Subscription should have required fields: id, jars_per_delivery, frequency, status', () => {
    expect(prisma.subscription.fields.id).toBeDefined();
    expect(prisma.subscription.fields.jars_per_delivery).toBeDefined();
    expect(prisma.subscription.fields.frequency).toBeDefined();
    expect(prisma.subscription.fields.status).toBeDefined();
  });

  it('Order should have required fields: id, qty, total_amount, status', () => {
    expect(prisma.order.fields.id).toBeDefined();
    expect(prisma.order.fields.qty).toBeDefined();
    expect(prisma.order.fields.total_amount).toBeDefined();
    expect(prisma.order.fields.status).toBeDefined();
  });

  it('MonthlyBill should have required fields: id, month, total_amount, paid_amount, status', () => {
    expect(prisma.monthlyBill.fields.id).toBeDefined();
    expect(prisma.monthlyBill.fields.month).toBeDefined();
    expect(prisma.monthlyBill.fields.total_amount).toBeDefined();
    expect(prisma.monthlyBill.fields.paid_amount).toBeDefined();
    expect(prisma.monthlyBill.fields.status).toBeDefined();
  });

  it('Payment should have required fields: id, amount, currency, payment_mode, status', () => {
    expect(prisma.payment.fields.id).toBeDefined();
    expect(prisma.payment.fields.amount).toBeDefined();
    expect(prisma.payment.fields.currency).toBeDefined();
    expect(prisma.payment.fields.payment_mode).toBeDefined();
    expect(prisma.payment.fields.status).toBeDefined();
  });

  it('PaymentLink should have required fields: id, bill_id, status', () => {
    expect(prisma.paymentLink.fields.id).toBeDefined();
    expect(prisma.paymentLink.fields.bill_id).toBeDefined();
    expect(prisma.paymentLink.fields.status).toBeDefined();
  });

  it('Notification should have required fields: id, type, message, sent_via, status', () => {
    expect(prisma.notification.fields.id).toBeDefined();
    expect(prisma.notification.fields.type).toBeDefined();
    expect(prisma.notification.fields.message).toBeDefined();
    expect(prisma.notification.fields.sent_via).toBeDefined();
    expect(prisma.notification.fields.status).toBeDefined();
  });
});

describe('Enum Validations', () => {
  it('SubscriptionStatus enum should be defined correctly', () => {
    expect(Prisma.SubscriptionStatus.ACTIVE).toBe('ACTIVE');
    expect(Prisma.SubscriptionStatus.INACTIVE).toBe('INACTIVE');
    expect(Prisma.SubscriptionStatus.CANCELLED).toBe('CANCELLED');
    expect(Prisma.SubscriptionStatus.PENDING).toBe('PENDING');
  });

  it('OrderStatus enum should be defined correctly', () => {
    expect(Prisma.OrderStatus.PENDING).toBe('PENDING');
    expect(Prisma.OrderStatus.CONFIRMED).toBe('CONFIRMED');
    expect(Prisma.OrderStatus.SHIPPED).toBe('SHIPPED');
    expect(Prisma.OrderStatus.DELIVERED).toBe('DELIVERED');
    expect(Prisma.OrderStatus.CANCELLED).toBe('CANCELLED');
  });

  it('MonthlyBillStatus enum should be defined correctly', () => {
    expect(Prisma.MonthlyBillStatus.PENDING).toBe('PENDING');
    expect(Prisma.MonthlyBillStatus.PAID).toBe('PAID');
    expect(Prisma.MonthlyBillStatus.OVERDUE).toBe('OVERDUE');
  });

  it('PaymentStatus enum should be defined correctly', () => {
    expect(Prisma.PaymentStatus.PENDING).toBe('PENDING');
    expect(Prisma.PaymentStatus.COMPLETED).toBe('COMPLETED');
    expect(Prisma.PaymentStatus.FAILED).toBe('FAILED');
    expect(Prisma.PaymentStatus.REFUNDED).toBe('REFUNDED');
  });

  it('PaymentLinkStatus enum should be defined correctly', () => {
    expect(Prisma.PaymentLinkStatus.ACTIVE).toBe('ACTIVE');
    expect(Prisma.PaymentLinkStatus.EXPIRED).toBe('EXPIRED');
    expect(Prisma.PaymentLinkStatus.USED).toBe('USED');
  });

  it('NotificationStatus enum should be defined correctly', () => {
    expect(Prisma.NotificationStatus.SENT).toBe('SENT');
    expect(Prisma.NotificationStatus.DELIVERED).toBe('DELIVERED');
    expect(Prisma.NotificationStatus.READ).toBe('READ');
    expect(Prisma.NotificationStatus.FAILED).toBe('FAILED');
  });
});
