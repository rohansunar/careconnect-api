import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { EmailChannelService } from '../channels/email-channel.service';
import { PushChannelService, PushNotificationPayload } from '../channels/push-channel.service';
import { renderToHtml } from '../../../email-templates/utils/renderTemplate';
import {
    CustomerOrderConfirmationTemplate,
    VendorOrderConfirmationTemplate,
    AdminOrderConfirmationTemplate,
    CustomerOrderCancellationTemplate,
    VendorOrderCancellationTemplate,
} from '../../../email-templates/templates/orders';
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
    ) { }

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
        this.logger.log(`Starting order creation notifications for order: ${orderId}`, { correlationId });

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
            const formattedAmount = this.formatCurrency(Number(order.total_amount), currency);

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
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                    result.errors.push(`Customer email error: ${errorMsg}`);
                    this.logger.error(`Failed to send customer email: ${errorMsg}`, { correlationId });
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
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                    result.errors.push(`Vendor email error: ${errorMsg}`);
                    this.logger.error(`Failed to send vendor email: ${errorMsg}`, { correlationId });
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
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                    result.errors.push(`Vendor push error: ${errorMsg}`);
                    this.logger.error(`Failed to send vendor push: ${errorMsg}`, { correlationId });
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
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                result.errors.push(`Admin email error: ${errorMsg}`);
                this.logger.error(`Failed to send admin email: ${errorMsg}`, { correlationId });
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
            this.logger.error(`Order creation notifications failed: ${errorMsg}`, { correlationId });
            result.errors.push(`Critical error: ${errorMsg}`);
            return result;
        }
    }

    /**
     * Sends all notifications when an order is cancelled
     * 
     * Coordinates:
     * - Customer: Cancellation confirmation email
     * - Vendor: Cancellation notification email + push notification
     * 
     * @param orderId - Order ID
     * @returns Summary of notification results
     */
    async sendOrderCancellationNotifications(orderId: string): Promise<{
        customerEmailSent: boolean;
        vendorEmailSent: boolean;
        vendorPushSent: boolean;
        errors: string[];
    }> {
        const correlationId = `order-cancel-${orderId}-${Date.now()}`;
        this.logger.log(`Starting order cancellation notifications for order: ${orderId}`, { correlationId });

        const result = {
            customerEmailSent: false,
            vendorEmailSent: false,
            vendorPushSent: false,
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

            const currency = 'INR';
            const formattedAmount = this.formatCurrency(Number(order.total_amount), currency);
            const refundAmount = order.payment_status === 'REFUNDED' ? Number(order.total_amount) : undefined;

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
                            formattedCancellationDate: order.cancelledAt?.toLocaleDateString('en-IN', {
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
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                    result.errors.push(`Customer email error: ${errorMsg}`);
                    this.logger.error(`Failed to send customer cancellation email: ${errorMsg}`, { correlationId });
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
                            cancellationDate: order.cancelledAt?.toLocaleDateString('en-IN', {
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
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                    result.errors.push(`Vendor email error: ${errorMsg}`);
                    this.logger.error(`Failed to send vendor cancellation email: ${errorMsg}`, { correlationId });
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
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                    result.errors.push(`Vendor push error: ${errorMsg}`);
                    this.logger.error(`Failed to send vendor cancellation push: ${errorMsg}`, { correlationId });
                }
            }

            this.logger.log(
                `Order cancellation notifications completed for ${order.orderNo}`,
                { correlationId },
            );

            return result;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Order cancellation notifications failed: ${errorMsg}`, { correlationId });
            result.errors.push(`Critical error: ${errorMsg}`);
            return result;
        }
    }

    /**
     * Sends push notification to rider when order is assigned
     */
    async sendOrderAssignedToRiderNotification(orderId: string, riderId: string): Promise<boolean> {
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
            this.logger.error(`Failed to send rider assignment notification: ${errorMsg}`, { correlationId });
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
            this.logger.error(`Failed to send out for delivery notification: ${errorMsg}`, { correlationId });
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
            this.logger.error(`Failed to send delivered notification: ${errorMsg}`, { correlationId });
            return false;
        }
    }

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
                this.logger.debug(`No active tokens found for user ${userId}`, { correlationId });
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
