import { Button, Heading, Section, Text } from '@react-email/components';
import React from 'react';
import type { BaseEmailProps, DetailsTableRow } from '../../types';
import {
    DetailsTable,
    EmailFooter,
    EmailHeader,
    EmailLayout,
    InfoBox,
} from '../../components';

/**
 * Props for CustomerOrderCancellationTemplate
 */
export interface CustomerOrderCancellationTemplateProps extends BaseEmailProps {
    customerName: string;
    orderId: string;
    orderNumber: string;
    formattedAmount: string;
    currency?: string;
    cancellationReason: string;
    cancellationDate: string;
    formattedCancellationDate: string;
    refundAmount?: number;
    refundTimeline?: string;
    supportUrl?: string;
}

/**
 * CustomerOrderCancellationTemplate - Email sent to customer when order is cancelled
 * Confirms cancellation and provides refund information if applicable
 */
export const CustomerOrderCancellationTemplate: React.FC<
    CustomerOrderCancellationTemplateProps
> = ({
    recipientName,
    customerName,
    orderId,
    orderNumber,
    formattedAmount,
    currency = '₹',
    cancellationReason,
    cancellationDate,
    formattedCancellationDate,
    refundAmount,
    refundTimeline,
    supportUrl,
}) => {
        const hasRefund = refundAmount && refundAmount > 0;

        const cancellationRows: DetailsTableRow[] = [
            { label: 'Order Number', value: orderNumber, isBold: true },
            { label: 'Cancellation Date', value: formattedCancellationDate },
            {
                label: 'Order Amount',
                value: formattedAmount,
            },
            { label: 'Cancellation Reason', value: cancellationReason },
        ];

        if (hasRefund) {
            cancellationRows.push({
                label: 'Refund Amount',
                value: `${currency}${refundAmount.toFixed(2)}`,
                isBold: true,
            });

            if (refundTimeline) {
                cancellationRows.push({
                    label: 'Refund Timeline',
                    value: refundTimeline,
                });
            }
        }

        return (
            <EmailLayout
                recipientName={recipientName || customerName}
                previewText={`Order Cancelled - ${orderNumber}`}
            >
                <EmailHeader
                    title="Order Cancelled"
                    gradientFrom="#ef4444"
                    gradientTo="#dc2626"
                />

                <Section style={contentSection}>
                    <Text style={greeting}>Hello {customerName},</Text>
                    <Text style={paragraph}>
                        Your order has been successfully cancelled. We're sorry to see you go!
                        {hasRefund && ' Your refund is being processed.'}
                    </Text>

                    <Heading style={sectionHeading}>Cancellation Details</Heading>
                    <DetailsTable rows={cancellationRows} />

                    {hasRefund ? (
                        <InfoBox
                            title="💰 Refund Information"
                            content={`Your refund of ${currency}${refundAmount?.toFixed(2)} will be processed within ${refundTimeline || '5-7 business days'}. The amount will be credited to your original payment method.`}
                            variant="warning"
                        />
                    ) : (
                        <InfoBox
                            title="ℹ️ No Refund Required"
                            content="Since this was a Cash on Delivery order or payment was not completed, no refund is necessary."
                            variant="info"
                        />
                    )}

                    <Section style={feedbackSection}>
                        <Heading style={sectionHeading}>We Value Your Feedback</Heading>
                        <Text style={paragraph}>
                            We'd love to hear about your experience. Your feedback helps us
                            improve our service for everyone.
                        </Text>
                    </Section>

                    {supportUrl && (
                        <Section style={buttonSection}>
                            <Button href={supportUrl} style={button}>
                                Contact Support
                            </Button>
                        </Section>
                    )}
                </Section>

                <EmailFooter
                    companyName="Water Delivery System"
                    supportEmail="support@droptro.com"
                />
            </EmailLayout>
        );
    };

const contentSection = {
    padding: '24px',
    backgroundColor: '#ffffff',
};

const greeting = {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#1f2937',
};

const paragraph = {
    fontSize: '16px',
    lineHeight: '26px',
    color: '#4b5563',
    marginBottom: '25px',
};

const sectionHeading = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333333',
    margin: '32px 0 16px 0',
};

const feedbackSection = {
    marginTop: '40px',
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
};

const buttonSection = {
    textAlign: 'center' as const,
    margin: '32px 0',
};

const button = {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    padding: '14px 28px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    display: 'inline-block',
};
