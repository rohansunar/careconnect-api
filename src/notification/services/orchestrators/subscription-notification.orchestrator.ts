import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { EmailChannelService } from '../channels/email-channel.service';
import { renderToHtml } from '../../../email-templates/utils/renderTemplate';
import {
    SubscriptionConfirmationTemplate,
    SubscriptionActivationTemplate,
    SubscriptionRenewalReminderTemplate,
} from '../../../email-templates/templates/subscriptions';
import React from 'react';

/**
 * SubscriptionNotificationOrchestrator coordinates all notifications for subscription lifecycle events
 * 
 * Handles:
 * - Subscription confirmation (after creation)
 * - Subscription activation (after payment success)
 * - Subscription renewal reminder (3 days before)
 * - Subscription expiration
 * - Subscription payment failure
 */
@Injectable()
export class SubscriptionNotificationOrchestrator {
    private readonly logger = new Logger(SubscriptionNotificationOrchestrator.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly emailChannel: EmailChannelService,
    ) { }

    /**
     * Sends confirmation email when subscription is first created
     */
    async sendSubscriptionConfirmationNotification(subscriptionId: string): Promise<boolean> {
        const correlationId = `subscription-confirm-${subscriptionId}-${Date.now()}`;

        try {
            const subscription = await this.prisma.subscription.findUnique({
                where: { id: subscriptionId },
                include: {
                    customer: true,
                    product: true,
                },
            });

            if (!subscription || !subscription.customer?.email) {
                throw new Error(`Subscription or customer email not found: ${subscriptionId}`);
            }

            const currency = 'INR';
            const formattedAmount = this.formatCurrency(subscription.total_price, currency);

            const html = await renderToHtml(
                React.createElement(SubscriptionConfirmationTemplate, {
                    customerName: subscription.customer.name,
                    subscriptionId: subscription.id,
                    productName: subscription.product?.name || 'Subscription',
                    frequency: this.formatFrequency(subscription.frequency),
                    nextDeliveryDate: subscription.next_delivery_date?.toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    }) || 'To be scheduled',
                    formattedAmount,
                    currency,
                    quantity: subscription.quantity,
                    startDate: subscription.start_date.toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    }),
                }),
            );

            const result = await this.emailChannel.sendEmail(
                subscription.customer.email,
                `Subscription Confirmed - ${subscription.product?.name || 'Subscription'}`,
                html,
                correlationId,
            );

            this.logger.log(`Subscription confirmation email sent: ${result.success}`, { correlationId });
            return result.success;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to send subscription confirmation: ${errorMsg}`, { correlationId });
            return false;
        }
    }

    /**
     * Sends activation email when subscription payment succeeds
     */
    async sendSubscriptionActivationNotification(subscriptionId: string): Promise<boolean> {
        const correlationId = `subscription-activate-${subscriptionId}-${Date.now()}`;

        try {
            const subscription = await this.prisma.subscription.findUnique({
                where: { id: subscriptionId },
                include: {
                    customer: true,
                    product: true,
                },
            });

            if (!subscription || !subscription.customer?.email) {
                throw new Error(`Subscription or customer email not found: ${subscriptionId}`);
            }

            const currency = 'INR';
            const formattedAmount = this.formatCurrency(subscription.total_price, currency);

            const html = await renderToHtml(
                React.createElement(SubscriptionActivationTemplate, {
                    customerName: subscription.customer.name,
                    productName: subscription.product?.name || 'Subscription',
                    frequency: this.formatFrequency(subscription.frequency),
                    nextDeliveryDate: subscription.next_delivery_date?.toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    }) || 'To be scheduled',
                    formattedAmount,
                    quantity: subscription.quantity,
                }),
            );

            const result = await this.emailChannel.sendEmail(
                subscription.customer.email,
                `Subscription Activated - ${subscription.product?.name || 'Subscription'}`,
                html,
                correlationId,
            );

            this.logger.log(`Subscription activation email sent: ${result.success}`, { correlationId });
            return result.success;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to send subscription activation: ${errorMsg}`, { correlationId });
            return false;
        }
    }

    /**
     * Sends renewal reminder email 3 days before subscription renewal
     */
    async sendSubscriptionRenewalReminderNotification(subscriptionId: string): Promise<boolean> {
        const correlationId = `subscription-reminder-${subscriptionId}-${Date.now()}`;

        try {
            const subscription = await this.prisma.subscription.findUnique({
                where: { id: subscriptionId },
                include: {
                    customer: true,
                    product: true,
                },
            });

            if (!subscription || !subscription.customer?.email) {
                throw new Error(`Subscription or customer email not found: ${subscriptionId}`);
            }

            const currency = 'INR';
            const formattedAmount = this.formatCurrency(subscription.total_price, currency);

            // Calculate renewal date (3 days from now)
            const renewalDate = new Date();
            renewalDate.setDate(renewalDate.getDate() + 3);

            const html = await renderToHtml(
                React.createElement(SubscriptionRenewalReminderTemplate, {
                    customerName: subscription.customer.name,
                    productName: subscription.product?.name || 'Subscription',
                    renewalDate: renewalDate.toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    }),
                    formattedAmount,
                }),
            );

            const result = await this.emailChannel.sendEmail(
                subscription.customer.email,
                `Subscription Renewal Reminder - ${subscription.product?.name || 'Subscription'}`,
                html,
                correlationId,
            );

            this.logger.log(`Subscription renewal reminder sent: ${result.success}`, { correlationId });
            return result.success;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to send renewal reminder: ${errorMsg}`, { correlationId });
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
     * Helper: Format frequency for display
     */
    private formatFrequency(frequency: any): string {
        const frequencyMap: Record<string, string> = {
            DAILY: 'Daily',
            WEEKLY: 'Weekly',
            BIWEEKLY: 'Bi-weekly',
            MONTHLY: 'Monthly',
        };

        return frequencyMap[frequency] || frequency;
    }
}
