import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { EmailChannelService } from '../channels/email-channel.service';
import {
  PushChannelService,
  PushNotificationPayload,
} from '../channels/push-channel.service';
import { WhatsAppChannelService } from '../channels/whatsapp-channel.service';
import { renderToHtml } from '../../../email-templates/utils/renderTemplate';
import {
  CustomerOrderConfirmationTemplate,
  VendorOrderConfirmationTemplate,
  AdminOrderConfirmationTemplate,
  CustomerOrderCancellationTemplate,
  VendorOrderCancellationTemplate,
  AdminOrderCancellationTemplate,
  CustomerOrderDeliveredTemplate,
  VendorOrderDeliveredTemplate,
  AdminOrderDeliveredTemplate,
} from '../../../email-templates/templates/orders';
import { AdminVendorUnavailableTemplate } from '../../../email-templates/templates/orders/admin-vendor-unavailable';
import { NotificationType } from '../../types/notification-types.enum';
import { UserType } from '../../dto/user-type.enum';
import React from 'react';

/**
 * OrderNotificationOrchestrator coordinates all notifications for order lifecycle events
 *
 * This orchestrator handles complex business flows that require multiple notification channels:
 * - Order creation: Emails to customer, vendor, admin + push notification to vendor
 * - Order cancellation: Emails to customer, vendor + push notification to vendor
 * - Order assignment: Push notification to rider
 * - Order out for delivery: Push notification to customer
 * - Order delivered: Push notification to customer
 *
 * Benefits of this orchestration layer:
 * - Centralized business logic for notification flows
 * - Coordinates multiple channels (email, push)
 * - Handles failures gracefully without affecting order flow
 * - Provides comprehensive logging and tracking
 */
@Injectable()
export class OrderNotificationOrchestrator {
  private readonly logger = new Logger(OrderNotificationOrchestrator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailChannel: EmailChannelService,
    private readonly pushChannel: PushChannelService,
    private readonly whatsappChannel: WhatsAppChannelService,
  ) {}

  /**
   * Sends all notifications when an order is created
   *
   * Coordinates:
   * - Customer: Order confirmation email
   * - Vendor: Order notification email + push notification
   * - Admin: Order notification email
   *
   * @param orderId - Order ID
   * @returns Summary of notification results
   */
  async sendOrderCreationNotifications(orderId: string): Promise<{
    customerEmailSent: boolean;
    vendorEmailSent: boolean;
    vendorPushSent: boolean;
    adminEmailSent: boolean;
    errors: string[];
  }> {
    const correlationId = `order-create-${orderId}-${Date.now()}`;
    this.logger.log(
      `Starting order creation notifications for order: ${orderId}`,
      { correlationId },
    );

    const result = {
      customerEmailSent: false,
      vendorEmailSent: false,
      vendorPushSent: false,
      adminEmailSent: false,
      errors: [] as string[],
    };

    try {
      // Fetch order with all required relations
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          vendor: true,
          address: {
            include: {
              location: true,
            },
          },
          orderItems: {
            include: {
              product: true,
            },
          },
          payment: true,
        },
      });

      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      const adminEmail = process.env.ADMIN_EMAIL || 'admin@waterdelivery.com';
      const currency = 'INR';
      const formattedAmount = this.formatCurrency(
        Number(order.total_amount),
        currency,
      );

      // Build delivery address
      const deliveryAddress = this.buildDeliveryAddress(order.address);

      // Build product list
      const products = order.orderItems.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: Number(item.price),
        // Note: unit field doesn't exist in Product schema, omitting it
      }));

      // Send customer email
      if (order.customer?.email) {
        try {
          const html = await renderToHtml(
            React.createElement(CustomerOrderConfirmationTemplate, {
              customerName: order.customer.name,
              orderId: order.id,
              orderNumber: order.orderNo,
              formattedAmount,
              currency,
              itemCount: order.orderItems.length,
              paymentMode: order.payment_mode,
              orderDate: order.created_at.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
              deliveryAddress,
              products,
            }),
          );

          const emailResult = await this.emailChannel.sendEmail(
            order.customer.email,
            `Order Confirmation - ${order.orderNo}`,
            html,
            correlationId,
          );

          result.customerEmailSent = emailResult.success;
          if (!emailResult.success) {
            result.errors.push(`Customer email failed: ${emailResult.error}`);
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Customer email error: ${errorMsg}`);
          this.logger.error(`Failed to send customer email: ${errorMsg}`, {
            correlationId,
          });
        }
      }

      // Send vendor email
      if (order.vendor?.email) {
        try {
          const html = await renderToHtml(
            React.createElement(VendorOrderConfirmationTemplate, {
              vendorName: order.vendor.name || 'Vendor',
              orderId: order.id,
              orderNumber: order.orderNo,
              formattedAmount,
              currency,
              itemCount: order.orderItems.length,
              paymentMode: order.payment_mode,
              orderDate: order.created_at.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
              customerName: order.customer?.name,
              customerEmail: order.customer?.email || undefined,
              deliveryAddress,
              dashboardUrl: process.env.VENDOR_DASHBOARD_URL || '',
            }),
          );

          const emailResult = await this.emailChannel.sendEmail(
            order.vendor.email,
            `New Order Received - ${order.orderNo}`,
            html,
            correlationId,
          );

          result.vendorEmailSent = emailResult.success;
          if (!emailResult.success) {
            result.errors.push(`Vendor email failed: ${emailResult.error}`);
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Vendor email error: ${errorMsg}`);
          this.logger.error(`Failed to send vendor email: ${errorMsg}`, {
            correlationId,
          });
        }
      }

      // Send vendor push notification
      if (order.vendorId) {
        try {
          const payload: PushNotificationPayload = {
            title: 'New Order Received! 📦',
            body: `Order #${order.orderNo} for ${formattedAmount}`,
            data: {
              orderId: order.id,
              orderNumber: order.orderNo,
              notificationType: NotificationType.ORDER_CREATED_VENDOR_PUSH,
              screen: 'OrderDetails',
            },
            sound: 'default',
          };

          const successCount = await this.sendPushToUser(
            order.vendorId,
            UserType.VENDOR,
            payload,
            correlationId,
          );

          result.vendorPushSent = successCount > 0;
          if (successCount === 0) {
            result.errors.push('Vendor push notification failed');
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Vendor push error: ${errorMsg}`);
          this.logger.error(`Failed to send vendor push: ${errorMsg}`, {
            correlationId,
          });
        }
      }

      // Send admin email
      try {
        const html = await renderToHtml(
          React.createElement(AdminOrderConfirmationTemplate, {
            orderId: order.id,
            orderNumber: order.orderNo,
            formattedAmount,
            currency,
            itemCount: order.orderItems.length,
            paymentMode: order.payment_mode,
            orderDate: order.created_at.toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            customerName: order.customer?.name,
            customerEmail: order.customer?.email || undefined,
            vendorName: order.vendor?.name || 'Vendor',
            deliveryAddress,
            adminDashboardUrl: process.env.ADMIN_DASHBOARD_URL || '',
          }),
        );

        const emailResult = await this.emailChannel.sendEmail(
          adminEmail,
          `New Order - ${order.orderNo}`,
          html,
          correlationId,
        );

        result.adminEmailSent = emailResult.success;
        if (!emailResult.success) {
          result.errors.push(`Admin email failed: ${emailResult.error}`);
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Admin email error: ${errorMsg}`);
        this.logger.error(`Failed to send admin email: ${errorMsg}`, {
          correlationId,
        });
      }

      this.logger.log(
        `Order creation notifications completed for ${order.orderNo}: ` +
          `customer=${result.customerEmailSent}, vendor=${result.vendorEmailSent}, ` +
          `vendorPush=${result.vendorPushSent}, admin=${result.adminEmailSent}`,
        { correlationId },
      );

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Order creation notifications failed: ${errorMsg}`, {
        correlationId,
      });
      result.errors.push(`Critical error: ${errorMsg}`);
      return result;
    }
  }

  /**
   * Sends all notifications when an order is cancelled
   *
   * Coordinates:
   * - Customer: Cancellation confirmation email + push notification
   * - Vendor: Cancellation notification email + push notification
   * - Admin: Cancellation notification email
   *
   * @param orderId - Order ID
   * @returns Summary of notification results
   */
  async sendOrderCancellationNotifications(orderId: string): Promise<{
    customerEmailSent: boolean;
    customerPushSent: boolean;
    vendorEmailSent: boolean;
    vendorPushSent: boolean;
    adminEmailSent: boolean;
    errors: string[];
  }> {
    const correlationId = `order-cancel-${orderId}-${Date.now()}`;
    this.logger.log(
      `Starting order cancellation notifications for order: ${orderId}`,
      { correlationId },
    );

    const result = {
      customerEmailSent: false,
      customerPushSent: false,
      vendorEmailSent: false,
      vendorPushSent: false,
      adminEmailSent: false,
      errors: [] as string[],
    };

    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          vendor: true,
          payment: true,
        },
      });

      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      const adminEmail = process.env.ADMIN_EMAIL || 'admin@waterdelivery.com';
      const currency = 'INR';
      const formattedAmount = this.formatCurrency(
        Number(order.total_amount),
        currency,
      );
      const refundAmount =
        order.payment_mode === 'ONLINE'
          ? Number(order.total_amount)
          : undefined;

      // Send customer email
      if (order.customer?.email) {
        try {
          const html = await renderToHtml(
            React.createElement(CustomerOrderCancellationTemplate, {
              customerName: order.customer.name,
              orderId: order.id,
              orderNumber: order.orderNo,
              formattedAmount,
              currency,
              cancellationReason: order.cancelReason || 'No reason provided',
              cancellationDate: order.cancelledAt?.toISOString() || '',
              formattedCancellationDate:
                order.cancelledAt?.toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }) || '',
              refundAmount,
              refundTimeline: refundAmount ? '5-7 business days' : undefined,
            }),
          );

          const emailResult = await this.emailChannel.sendEmail(
            order.customer.email,
            `Order Cancelled - ${order.orderNo}`,
            html,
            correlationId,
          );

          result.customerEmailSent = emailResult.success;
          if (!emailResult.success) {
            result.errors.push(`Customer email failed: ${emailResult.error}`);
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Customer email error: ${errorMsg}`);
          this.logger.error(
            `Failed to send customer cancellation email: ${errorMsg}`,
            { correlationId },
          );
        }
      }

      // Send customer push notification
      if (order.customerId) {
        try {
          const payload: PushNotificationPayload = {
            title: 'Order Cancelled 🚫',
            body: `Your order #${order.orderNo} has been cancelled. ${refundAmount ? `Refund of ₹${refundAmount} will be processed.` : ''}`,
            data: {
              orderId: order.id,
              orderNumber: order.orderNo,
              notificationType: NotificationType.ORDER_CANCELLED_CUSTOMER,
              screen: 'OrderDetails',
            },
            sound: 'default',
          };

          const successCount = await this.sendPushToUser(
            order.customerId,
            UserType.CUSTOMER,
            payload,
            correlationId,
          );

          result.customerPushSent = successCount > 0;
          if (successCount === 0) {
            result.errors.push('Customer push notification failed');
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Customer push error: ${errorMsg}`);
          this.logger.error(
            `Failed to send customer cancellation push: ${errorMsg}`,
            { correlationId },
          );
        }
      }

      // Send vendor email
      if (order.vendor?.email) {
        try {
          const html = await renderToHtml(
            React.createElement(VendorOrderCancellationTemplate, {
              vendorName: order.vendor.name || 'Vendor',
              orderId: order.id,
              orderNumber: order.orderNo,
              formattedAmount,
              currency,
              cancellationReason: order.cancelReason || 'No reason provided',
              cancellationDate:
                order.cancelledAt?.toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }) || '',
              customerName: order.customer?.name,
            }),
          );

          const emailResult = await this.emailChannel.sendEmail(
            order.vendor.email,
            `Order Cancelled - ${order.orderNo}`,
            html,
            correlationId,
          );

          result.vendorEmailSent = emailResult.success;
          if (!emailResult.success) {
            result.errors.push(`Vendor email failed: ${emailResult.error}`);
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Vendor email error: ${errorMsg}`);
          this.logger.error(
            `Failed to send vendor cancellation email: ${errorMsg}`,
            { correlationId },
          );
        }
      }

      // Send vendor push notification
      if (order.vendorId) {
        try {
          const payload: PushNotificationPayload = {
            title: 'Order Cancelled 🚫',
            body: `Order #${order.orderNo} was cancelled`,
            data: {
              orderId: order.id,
              orderNumber: order.orderNo,
              notificationType: NotificationType.ORDER_CANCELLED_VENDOR_PUSH,
              screen: 'OrderDetails',
            },
            sound: 'default',
          };

          const successCount = await this.sendPushToUser(
            order.vendorId,
            UserType.VENDOR,
            payload,
            correlationId,
          );

          result.vendorPushSent = successCount > 0;
          if (successCount === 0) {
            result.errors.push('Vendor push notification failed');
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Vendor push error: ${errorMsg}`);
          this.logger.error(
            `Failed to send vendor cancellation push: ${errorMsg}`,
            { correlationId },
          );
        }
      }

      // Send admin email
      try {
        const html = await renderToHtml(
          React.createElement(AdminOrderCancellationTemplate, {
            orderId: order.id,
            orderNumber: order.orderNo,
            formattedAmount,
            currency,
            cancellationReason: order.cancelReason || 'No reason provided',
            cancellationDate:
              order.cancelledAt?.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }) || '',
            customerName: order.customer?.name,
            customerEmail: order.customer?.email || undefined,
            vendorName: order.vendor?.name || 'Vendor',
            vendorEmail: order.vendor?.email || undefined,
            refundAmount,
            adminDashboardUrl: process.env.ADMIN_DASHBOARD_URL || '',
          }),
        );

        const emailResult = await this.emailChannel.sendEmail(
          adminEmail,
          `Order Cancelled - ${order.orderNo}`,
          html,
          correlationId,
        );

        result.adminEmailSent = emailResult.success;
        if (!emailResult.success) {
          result.errors.push(`Admin email failed: ${emailResult.error}`);
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Admin email error: ${errorMsg}`);
        this.logger.error(
          `Failed to send admin cancellation email: ${errorMsg}`,
          { correlationId },
        );
      }

      this.logger.log(
        `Order cancellation notifications completed for ${order.orderNo}: ` +
          `customerEmail=${result.customerEmailSent}, customerPush=${result.customerPushSent}, ` +
          `vendorEmail=${result.vendorEmailSent}, vendorPush=${result.vendorPushSent}, ` +
          `admin=${result.adminEmailSent}`,
        { correlationId },
      );

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Order cancellation notifications failed: ${errorMsg}`,
        { correlationId },
      );
      result.errors.push(`Critical error: ${errorMsg}`);
      return result;
    }
  }

  /**
   * Sends all notifications when an order is delivered (OTP verified)
   *
   * Coordinates:
   * - Customer: Delivery confirmation email + push notification
   * - Vendor: Delivery confirmation email + push notification
   * - Admin: Delivery notification email only
   *
   * @param orderId - Order ID
   * @returns Summary of notification results
   */
  async sendOrderDeliveredNotifications(orderId: string): Promise<{
    customerEmailSent: boolean;
    customerPushSent: boolean;
    vendorEmailSent: boolean;
    vendorPushSent: boolean;
    adminEmailSent: boolean;
    errors: string[];
  }> {
    const correlationId = `order-delivered-${orderId}-${Date.now()}`;
    this.logger.log(
      `Starting order delivery notifications for order: ${orderId}`,
      { correlationId },
    );

    const result = {
      customerEmailSent: false,
      customerPushSent: false,
      vendorEmailSent: false,
      vendorPushSent: false,
      adminEmailSent: false,
      errors: [] as string[],
    };

    try {
      // Fetch order with all required relations
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          vendor: true,
          address: {
            include: {
              location: true,
            },
          },
          orderItems: {
            include: {
              product: true,
            },
          },
          payment: true,
        },
      });

      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      const adminEmail = process.env.ADMIN_EMAIL || 'admin@waterdelivery.com';
      const currency = 'INR';
      const formattedAmount = this.formatCurrency(
        Number(order.total_amount),
        currency,
      );

      // Build delivery address
      const deliveryAddress = this.buildDeliveryAddress(order.address);

      // Build product list
      const products = order.orderItems.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: Number(item.price),
      }));

      const deliveryDate = new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Send customer email
      if (order.customer?.email) {
        try {
          const html = await renderToHtml(
            React.createElement(CustomerOrderDeliveredTemplate, {
              customerName: order.customer.name,
              orderId: order.id,
              orderNumber: order.orderNo,
              formattedAmount,
              currency,
              itemCount: order.orderItems.length,
              paymentMode: order.payment_mode,
              deliveryDate,
              deliveryAddress,
              products,
              feedbackUrl: process.env.CUSTOMER_FEEDBACK_URL || '',
            }),
          );

          const emailResult = await this.emailChannel.sendEmail(
            order.customer.email,
            `Order Delivered - ${order.orderNo}`,
            html,
            correlationId,
          );

          result.customerEmailSent = emailResult.success;
          if (!emailResult.success) {
            result.errors.push(`Customer email failed: ${emailResult.error}`);
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Customer email error: ${errorMsg}`);
          this.logger.error(
            `Failed to send customer delivery email: ${errorMsg}`,
            {
              correlationId,
            },
          );
        }
      }

      // Send customer push notification
      if (order.customerId) {
        try {
          const payload: PushNotificationPayload = {
            title: 'Order Delivered ✅',
            body: `Your order #${order.orderNo} has been delivered. Enjoy!`,
            data: {
              orderId: order.id,
              orderNumber: order.orderNo,
              notificationType: NotificationType.ORDER_DELIVERED_CUSTOMER,
              screen: 'OrderDetails',
            },
            sound: 'default',
          };

          const successCount = await this.sendPushToUser(
            order.customerId,
            UserType.CUSTOMER,
            payload,
            correlationId,
          );

          result.customerPushSent = successCount > 0;
          if (successCount === 0) {
            result.errors.push('Customer push notification failed');
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Customer push error: ${errorMsg}`);
          this.logger.error(
            `Failed to send customer delivery push: ${errorMsg}`,
            { correlationId },
          );
        }
      }

      // Send vendor email
      if (order.vendor?.email) {
        try {
          const html = await renderToHtml(
            React.createElement(VendorOrderDeliveredTemplate, {
              vendorName: order.vendor.name || 'Vendor',
              orderId: order.id,
              orderNumber: order.orderNo,
              formattedAmount,
              currency,
              itemCount: order.orderItems.length,
              paymentMode: order.payment_mode,
              deliveryDate,
              customerName: order.customer?.name,
              customerEmail: order.customer?.email || undefined,
              products,
              dashboardUrl: process.env.VENDOR_DASHBOARD_URL || '',
            }),
          );

          const emailResult = await this.emailChannel.sendEmail(
            order.vendor.email,
            `Order Delivered - ${order.orderNo}`,
            html,
            correlationId,
          );

          result.vendorEmailSent = emailResult.success;
          if (!emailResult.success) {
            result.errors.push(`Vendor email failed: ${emailResult.error}`);
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Vendor email error: ${errorMsg}`);
          this.logger.error(
            `Failed to send vendor delivery email: ${errorMsg}`,
            {
              correlationId,
            },
          );
        }
      }

      // Send vendor push notification
      if (order.vendorId) {
        try {
          const payload: PushNotificationPayload = {
            title: 'Order Delivered 🎉',
            body: `Order #${order.orderNo} has been successfully delivered`,
            data: {
              orderId: order.id,
              orderNumber: order.orderNo,
              notificationType: NotificationType.ORDER_DELIVERED_VENDOR_PUSH,
              screen: 'OrderDetails',
            },
            sound: 'default',
          };

          const successCount = await this.sendPushToUser(
            order.vendorId,
            UserType.VENDOR,
            payload,
            correlationId,
          );

          result.vendorPushSent = successCount > 0;
          if (successCount === 0) {
            result.errors.push('Vendor push notification failed');
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Vendor push error: ${errorMsg}`);
          this.logger.error(
            `Failed to send vendor delivery push: ${errorMsg}`,
            { correlationId },
          );
        }
      }

      // Send admin email
      try {
        const html = await renderToHtml(
          React.createElement(AdminOrderDeliveredTemplate, {
            orderId: order.id,
            orderNumber: order.orderNo,
            formattedAmount,
            currency,
            itemCount: order.orderItems.length,
            paymentMode: order.payment_mode,
            deliveryDate,
            customerName: order.customer?.name,
            customerEmail: order.customer?.email || undefined,
            vendorName: order.vendor?.name || 'Vendor',
            vendorEmail: order.vendor?.email || undefined,
            products,
            adminDashboardUrl: process.env.ADMIN_DASHBOARD_URL || '',
          }),
        );

        const emailResult = await this.emailChannel.sendEmail(
          adminEmail,
          `Order Delivered - ${order.orderNo}`,
          html,
          correlationId,
        );

        result.adminEmailSent = emailResult.success;
        if (!emailResult.success) {
          result.errors.push(`Admin email failed: ${emailResult.error}`);
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Admin email error: ${errorMsg}`);
        this.logger.error(`Failed to send admin delivery email: ${errorMsg}`, {
          correlationId,
        });
      }

      this.logger.log(
        `Order delivery notifications completed for ${order.orderNo}: ` +
          `customerEmail=${result.customerEmailSent}, customerPush=${result.customerPushSent}, ` +
          `vendorEmail=${result.vendorEmailSent}, vendorPush=${result.vendorPushSent}, ` +
          `admin=${result.adminEmailSent}`,
        { correlationId },
      );

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Order delivery notifications failed: ${errorMsg}`, {
        correlationId,
      });
      result.errors.push(`Critical error: ${errorMsg}`);
      return result;
    }
  }

  /**
   * Sends push notification to rider when order is assigned
   */
  async sendOrderAssignedToRiderNotification(
    orderId: string,
    riderId: string,
  ): Promise<boolean> {
    const correlationId = `order-assign-${orderId}-${Date.now()}`;

    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      const payload: PushNotificationPayload = {
        title: 'New Delivery Assignment 🚴',
        body: `You've been assigned order #${order.orderNo}`,
        data: {
          orderId: order.id,
          orderNumber: order.orderNo,
          notificationType: NotificationType.ORDER_ASSIGNED_RIDER,
          screen: 'RiderDeliveryDetails',
        },
        sound: 'default',
      };

      const successCount = await this.sendPushToUser(
        riderId,
        UserType.RIDER,
        payload,
        correlationId,
      );

      return successCount > 0;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send rider assignment notification: ${errorMsg}`,
        { correlationId },
      );
      return false;
    }
  }

  /**
   * Sends push notification to customer when order is out for delivery
   */
  async sendOrderOutForDeliveryNotification(orderId: string): Promise<boolean> {
    const correlationId = `order-delivery-${orderId}-${Date.now()}`;

    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
        },
      });

      if (!order || !order.customerId) {
        throw new Error(`Order or customer not found: ${orderId}`);
      }

      const payload: PushNotificationPayload = {
        title: 'Order Out for Delivery 🚚',
        body: `Your order #${order.orderNo} is on its way!`,
        data: {
          orderId: order.id,
          orderNumber: order.orderNo,
          notificationType: NotificationType.ORDER_OUT_FOR_DELIVERY_CUSTOMER,
          screen: 'OrderTracking',
        },
        sound: 'default',
      };

      const successCount = await this.sendPushToUser(
        order.customerId,
        UserType.CUSTOMER,
        payload,
        correlationId,
      );

      return successCount > 0;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send out for delivery notification: ${errorMsg}`,
        { correlationId },
      );
      return false;
    }
  }

  /**
   * Sends push notification to customer when order is delivered
   */
  async sendOrderDeliveredNotification(orderId: string): Promise<boolean> {
    const correlationId = `order-delivered-${orderId}-${Date.now()}`;

    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
        },
      });

      if (!order || !order.customerId) {
        throw new Error(`Order or customer not found: ${orderId}`);
      }

      const payload: PushNotificationPayload = {
        title: 'Order Delivered ✅',
        body: `Your order #${order.orderNo} has been delivered. Enjoy!`,
        data: {
          orderId: order.id,
          orderNumber: order.orderNo,
          notificationType: NotificationType.ORDER_DELIVERED_CUSTOMER,
          screen: 'OrderDetails',
        },
        sound: 'default',
      };

      const successCount = await this.sendPushToUser(
        order.customerId,
        UserType.CUSTOMER,
        payload,
        correlationId,
      );

      return successCount > 0;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send delivered notification: ${errorMsg}`, {
        correlationId,
      });
      return false;
    }
  }

  /**
   * Sends bulk push notifications to a rider when multiple orders are assigned.
   *
   * @param orderIds - Array of assigned order IDs
   * @param riderId - The rider ID to notify
   * @returns True if at least one push notification was sent successfully
   */
  async sendBulkOrderAssignmentNotification(
    orderIds: string[],
    riderId: string,
  ): Promise<boolean> {
    const correlationId = `bulk-assign-${orderIds.length}-${Date.now()}`;

    try {
      // Fetch all orders for building notification content
      const orders = await this.prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, orderNo: true, total_amount: true },
      });

      if (orders.length === 0) {
        this.logger.warn(`No orders found for bulk assignment notification`, {
          correlationId,
        });
        return false;
      }

      const orderCount = orders.length;
      const totalAmount = orders.reduce(
        (sum, order) => sum + Number(order.total_amount),
        0,
      );
      const formattedAmount = this.formatCurrency(totalAmount);

      const payload: PushNotificationPayload = {
        title: `New Delivery Assignments! 🚴`,
        body: `You've been assigned ${orderCount} order(s) worth ${formattedAmount}`,
        data: {
          orderIds: orderIds.join(','),
          orderCount: orderCount.toString(),
          notificationType: NotificationType.ORDER_ASSIGNED_RIDER,
          screen: 'RiderDeliveryDetails',
        },
        sound: 'default',
      };

      const successCount = await this.sendPushToUser(
        riderId,
        UserType.RIDER,
        payload,
        correlationId,
      );

      this.logger.log(
        `Bulk assignment push notification sent to rider ${riderId}: ${successCount} devices`,
        { correlationId, successCount, orderCount },
      );

      return successCount > 0;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send bulk assignment notification: ${errorMsg}`,
        { correlationId },
      );
      return false;
    }
  }

  /**
   * Sends WhatsApp message to rider about new order assignments.
   *
   * @param orderIds - Array of assigned order IDs
   * @param rider - The rider record with contact info
   * @param correlationId - Correlation ID for tracing
   * @returns True if WhatsApp message was sent successfully
   */
  async sendRiderAssignmentWhatsApp(
    orderIds: string[],
    rider: { id: string; name: string; phone: string },
    correlationId: string,
  ): Promise<boolean> {
    try {
      // Fetch order details for the message
      const orders = await this.prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: {
          id: true,
          orderNo: true,
          total_amount: true,
          address: {
            select: {
              address: true,
              pincode: true,
            },
          },
        },
      });

      if (orders.length === 0) {
        this.logger.warn(`No orders found for WhatsApp notification`, {
          correlationId,
        });
        return false;
      }

      const totalAmount = orders.reduce(
        (sum, order) => sum + Number(order.total_amount),
        0,
      );
      const formattedAmount = this.formatCurrency(totalAmount);

      // Build order list for message
      const orderList = orders
        .slice(0, 5) // Limit to first 5 orders in message
        .map(
          (order) =>
            `• Order #${order.orderNo} - ${order.address?.address || 'N/A'}`,
        )
        .join('\n');

      const moreOrders =
        orders.length > 5 ? `\n...and ${orders.length - 5} more orders` : '';

      const message = `Hi ${rider.name}! 👋\n\nYou have been assigned ${orders.length} new delivery order(s):\n\n${orderList}${moreOrders}\n\nTotal Value: ${formattedAmount}\n\nPlease check your app for pickup details.\n\n- Water Delivery Team`;

      const result = await this.whatsappChannel.sendWhatsApp(
        rider.phone,
        message,
        correlationId,
      );

      this.logger.log(
        `Rider assignment WhatsApp sent to ${rider.phone}: ${result.success}`,
        { correlationId, messageId: result.messageId, success: result.success },
      );

      return result.success;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send rider assignment WhatsApp: ${errorMsg}`,
        { correlationId },
      );
      return false;
    }
  }

  /**
   * Sends push notification to rider when their assignment is reverted.
   *
   * @param orderId - The order ID
   * @param riderId - The rider ID
   * @returns True if push notification was sent successfully
   */
  async sendRiderAssignmentRevertedNotification(
    orderId: string,
    riderId: string,
  ): Promise<boolean> {
    const correlationId = `rider-revert-${orderId}-${Date.now()}`;

    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      const payload: PushNotificationPayload = {
        title: 'Delivery Assignment Cancelled 🚴',
        body: `Your assignment for order #${order.orderNo} has been cancelled by the vendor.`,
        data: {
          orderId: order.id,
          orderNumber: order.orderNo,
          notificationType: NotificationType.ORDER_ASSIGNMENT_REVERTED_RIDER,
          screen: 'RiderDashboard',
        },
        sound: 'default',
      };

      const successCount = await this.sendPushToUser(
        riderId,
        UserType.RIDER,
        payload,
        correlationId,
      );

      return successCount > 0;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send rider revert notification: ${errorMsg}`,
        { correlationId },
      );
      return false;
    }
  }

  /**
   * Sends WhatsApp message to rider when their assignment is reverted.
   *
   * @param orderId - The order ID
   * @param rider - The rider record with contact info
   * @param reason - The reason for revert
   * @param correlationId - Correlation ID for tracing
   * @returns True if WhatsApp message was sent successfully
   */
  async sendRiderRevertedWhatsApp(
    orderId: string,
    rider: { id: string; name: string; phone: string },
    correlationId: string,
  ): Promise<boolean> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          orderNo: true,
          total_amount: true,
          address: {
            select: {
              address: true,
              pincode: true,
            },
          },
        },
      });

      if (!order) {
        this.logger.warn(
          `Order not found for WhatsApp notification: ${orderId}`,
          {
            correlationId,
          },
        );
        return false;
      }

      const formattedAmount = this.formatCurrency(Number(order.total_amount));

      const message = `Hi ${rider.name}! 👋\n\nYour delivery assignment for order #${order.orderNo} has been cancelled by the vendor.\n\nOrder Details:\n• Order #: ${order.orderNo}\n• Value: ${formattedAmount}\n• Delivery Address: ${order.address?.address || 'N/A'} - ${order.address?.pincode || ''}`;

      const result = await this.whatsappChannel.sendWhatsApp(
        rider.phone,
        message,
        correlationId,
      );

      this.logger.log(
        `Rider revert WhatsApp sent to ${rider.phone}: ${result.success}`,
        { correlationId, messageId: result.messageId, success: result.success },
      );

      return result.success;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send rider revert WhatsApp: ${errorMsg}`, {
        correlationId,
      });
      return false;
    }
  }

  /**
   * Sends admin notification when vendor is inactive.
   *
   * @param subscriptionId - The subscription ID
   * @returns True if email sent successfully
   */
  async sendAdminVendorInactiveNotification(
    subscriptionId: string,
  ): Promise<boolean> {
    const correlationId = `vendor-inactive-${subscriptionId}-${Date.now()}`;
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@waterdelivery.com';

    try {
      await this.emailChannel.sendEmail(
        adminEmail,
        'Vendor Inactive - Order Skipped',
        `<p>Order generation was skipped for subscription <strong>${subscriptionId}</strong> because the vendor is inactive.</p>
         <p>Please review the subscription and activate the vendor if needed.</p>`,
        correlationId,
      );

      this.logger.log(
        `Vendor inactive notification sent for subscription ${subscriptionId}`,
        { correlationId },
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send vendor inactive notification for subscription ${subscriptionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { correlationId },
      );
      return false;
    }
  }

  /**
   * Sends admin notification when product is inactive.
   *
   * @param subscriptionId - The subscription ID
   * @returns True if email sent successfully
   */
  async sendAdminProductInactiveNotification(
    subscriptionId: string,
  ): Promise<boolean> {
    const correlationId = `product-inactive-${subscriptionId}-${Date.now()}`;
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@waterdelivery.com';

    try {
      await this.emailChannel.sendEmail(
        adminEmail,
        'Product Inactive - Order Skipped',
        `<p>Order generation was skipped for subscription <strong>${subscriptionId}</strong> because the product is inactive.</p>
         <p>Please review the subscription and activate the product if needed.</p>`,
        correlationId,
      );

      this.logger.log(
        `Product inactive notification sent for subscription ${subscriptionId}`,
        { correlationId },
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send product inactive notification for subscription ${subscriptionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { correlationId },
      );
      return false;
    }
  }

  /**
   * Sends admin notification when vendor is unavailable for today's delivery.
   * Uses AdminVendorUnavailableTemplate to notify admin about manual processing needed.
   *
   * @param subscription - Subscription details
   * @param product - Product details
   * @param customer - Customer details
   * @param totalPrice - Total price
   * @param priceSnapshot - Price snapshot
   * @param quantity - Quantity
   * @returns True if email sent successfully
   */
  async sendAdminVendorUnavailableNotification(
    subscription: { id: string },
    product: {
      name: string;
      vendor: { name: string; is_available_today: boolean };
    },
    customer: { id: string; name: string | null; phone: string | null },
    totalPrice: number,
    priceSnapshot: number,
    quantity: number,
  ): Promise<boolean> {
    const correlationId = `vendor-unavailable-${subscription.id}-${Date.now()}`;
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@waterdelivery.com';
    const timezone = process.env.TIMEZONE || 'Asia/Kolkata';
    const timestamp = new Date().toLocaleString('en-IN', {
      timeZone: timezone,
    });

    try {
      const html = await renderToHtml(
        React.createElement(AdminVendorUnavailableTemplate, {
          subscriptionId: subscription.id,
          timestamp,
          productName: product.name,
          price: `₹${priceSnapshot}`,
          quantity,
          vendorName: product.vendor.name,
          vendorAvailableToday: product.vendor.is_available_today,
          customerId: customer.id,
          customerName: customer.name || 'N/A',
          customerPhone: customer.phone || 'N/A',
          totalPrice: `₹${totalPrice}`,
          adminDashboardUrl: process.env.ADMIN_DASHBOARD_URL || '',
        }),
      );

      await this.emailChannel.sendEmail(
        adminEmail,
        'Action Required: Manual Order Processing Needed - Vendor Unavailable',
        html,
        correlationId,
      );

      this.logger.log(
        `Vendor unavailable notification sent for subscription ${subscription.id}`,
        { correlationId },
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send vendor unavailable notification for subscription ${subscription.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { correlationId },
      );
      return false;
    }
  }

  /**
   * Sends admin notification when order generation fails.
   *
   * @param subscriptionId - The subscription ID
   * @param errorMessage - The error message
   * @returns True if email sent successfully
   */
  async sendAdminOrderGenerationErrorNotification(
    subscriptionId: string,
    errorMessage: string,
  ): Promise<boolean> {
    const correlationId = `order-gen-error-${subscriptionId}-${Date.now()}`;
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@waterdelivery.com';

    try {
      await this.emailChannel.sendEmail(
        adminEmail,
        'Order Generation Error',
        `<p>An error occurred while generating an order for subscription <strong>${subscriptionId}</strong>.</p>
         <p><strong>Error:</strong> ${errorMessage}</p>
         <p>Please investigate and resolve the issue.</p>`,
        correlationId,
      );

      this.logger.log(
        `Order generation error notification sent for subscription ${subscriptionId}`,
        { correlationId },
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send order generation error notification for subscription ${subscriptionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { correlationId },
      );
      return false;
    }
  }

  /**
   * Sends admin notification when subscription is rescheduled due to vendor unavailability.
   *
   * @param subscriptionId - The subscription ID
   * @returns True if email sent successfully
   */
  async sendAdminRescheduledNotification(
    subscriptionId: string,
  ): Promise<boolean> {
    const correlationId = `rescheduled-${subscriptionId}-${Date.now()}`;
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@waterdelivery.com';

    try {
      await this.emailChannel.sendEmail(
        adminEmail,
        'Subscription Rescheduled',
        `<p>Subscription <strong>${subscriptionId}</strong> has been rescheduled due to vendor unavailability.</p>
         <p>The order was not created and will be retried on the next delivery date.</p>`,
        correlationId,
      );

      this.logger.log(
        `Rescheduled notification sent for subscription ${subscriptionId}`,
        { correlationId },
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send rescheduled notification for subscription ${subscriptionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { correlationId },
      );
      return false;
    }
  }

  /**
   * Sends push notification to customer only (without email).
   *
   * @param customerId - Customer ID
   * @param title - Notification title
   * @param body - Notification body
   * @param data - Optional additional data payload
   * @returns True if push notification was sent successfully
   */
  async sendCustomerPushNotificationOnly(
    customerId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    const correlationId = `customer-push-${customerId}-${Date.now()}`;

    try {
      const payload: PushNotificationPayload = {
        title,
        body,
        data: data || {},
        sound: 'default',
      };

      const successCount = await this.sendPushToUser(
        customerId,
        UserType.CUSTOMER,
        payload,
        correlationId,
      );

      this.logger.log(
        `Customer push notification sent: ${successCount} devices for customer ${customerId}`,
        { correlationId, successCount },
      );

      return successCount > 0;
    } catch (error) {
      this.logger.error(
        `Failed to send customer push notification to ${customerId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { correlationId },
      );
      return false;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Helper: Format currency
   */
  private formatCurrency(amount: number, currency: string = 'INR'): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Helper: Build delivery address string
   */
  private buildDeliveryAddress(address: any): string {
    if (!address) return '';

    const parts = [
      address.address,
      address.location?.name,
      address.location?.state,
      address.pincode,
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Helper: Send push notifications to a user by fetching their active tokens
   * and sending to each device individually.
   */
  private async sendPushToUser(
    userId: string,
    userType: UserType,
    payload: PushNotificationPayload,
    correlationId: string,
  ): Promise<number> {
    try {
      const tokens = await this.prisma.deviceToken.findMany({
        where: {
          user_id: userId,
          user_type: userType,
          is_active: true,
        },
        select: { device_token: true },
      });

      if (tokens.length === 0) {
        this.logger.debug(`No active tokens found for user ${userId}`, {
          correlationId,
        });
        return 0;
      }

      let successCount = 0;
      for (const token of tokens) {
        const result = await this.pushChannel.send(
          token.device_token,
          payload,
          correlationId,
        );
        if (result.success) {
          successCount++;
        }
      }

      return successCount;
    } catch (error) {
      this.logger.error(
        `Failed to send push to user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { correlationId },
      );
      return 0;
    }
  }
}
