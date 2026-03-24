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
 * Props for VendorOrderCancellationTemplate
 */
export interface VendorOrderCancellationTemplateProps extends BaseEmailProps {
    vendorName: string;
    orderId: string;
    orderNumber: string;
    formattedAmount: string;
    currency?: string;
    cancellationReason: string;
    cancellationDate: string;
    customerName?: string;
    dashboardUrl?: string;
}

/**
 * VendorOrderCancellationTemplate - Email sent to vendor when order is cancelled
 * Notifies vendor of cancellation and provides order details
 */
export const VendorOrderCancellationTemplate: React.FC<
    VendorOrderCancellationTemplateProps
> = ({
    recipientName,
    vendorName,
    orderId,
    orderNumber,
    formattedAmount,
    currency = '₹',
    cancellationReason,
    cancellationDate,
    customerName,
    dashboardUrl,
}) => {
        const cancellationRows: DetailsTableRow[] = [
            { label: 'Order Number', value: orderNumber, isBold: true },
            { label: 'Cancellation Date', value: cancellationDate },
            {
                label: 'Order Amount',
                value: formattedAmount,
            },
            { label: 'Reason', value: cancellationReason },
        ];

        if (customerName) {
            cancellationRows.push({
                label: 'Customer',
                value: customerName,
            });
        }

        return (
            <EmailLayout
                recipientName={recipientName || vendorName}
                previewText={`Order Cancelled - ${orderNumber}`}
            >
                <EmailHeader
                    title="Order Cancelled"
                    gradientFrom="#f59e0b"
                    gradientTo="#d97706"
                />

                <Section style={contentSection}>
                    <Text style={greeting}>Hello {vendorName},</Text>
                    <Text style={paragraph}>
                        An order has been cancelled. Please update your inventory and records
                        accordingly.
                    </Text>

                    <Heading style={sectionHeading}>Cancellation Details</Heading>
                    <DetailsTable rows={cancellationRows} />

                    <InfoBox
                        title="📦 Action Required"
                        content="• Update your inventory to reflect this cancellation<br>• Review the cancellation reason to improve service quality<br>• No further action is required for this order"
                        variant="warning"
                    />

                    {dashboardUrl && (
                        <Section style={buttonSection}>
                            <Button href={dashboardUrl} style={button}>
                                View Dashboard
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

const buttonSection = {
    textAlign: 'center' as const,
    margin: '32px 0',
};

const button = {
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    padding: '14px 28px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    display: 'inline-block',
};
