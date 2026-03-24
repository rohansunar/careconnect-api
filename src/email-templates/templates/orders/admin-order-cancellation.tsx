import { Heading, Section, Text } from '@react-email/components';
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
 * Props for AdminOrderCancellationTemplate
 */
export interface AdminOrderCancellationTemplateProps extends BaseEmailProps {
    orderId: string;
    orderNumber: string;
    formattedAmount: string;
    currency?: string;
    cancellationReason: string;
    cancellationDate: string;
    customerName?: string;
    customerEmail?: string;
    vendorName?: string;
    vendorEmail?: string;
    refundAmount?: number;
    adminDashboardUrl?: string;
}

/**
 * AdminOrderCancellationTemplate - Email sent to admin when order is cancelled
 * Provides cancellation summary for admin audit records
 */
export const AdminOrderCancellationTemplate: React.FC<AdminOrderCancellationTemplateProps> = ({
    orderId,
    orderNumber,
    formattedAmount,
    currency = '₹',
    cancellationReason,
    cancellationDate,
    customerName,
    customerEmail,
    vendorName,
    vendorEmail,
    refundAmount,
    adminDashboardUrl,
}) => {
    const orderRows: DetailsTableRow[] = [
        { label: 'Order ID', value: orderId, isBold: false },
        { label: 'Order Number', value: orderNumber, isBold: true },
        { label: 'Cancelled On', value: cancellationDate },
        {
            label: 'Order Value',
            value: `${formattedAmount}`,
            isBold: true,
        },
        { label: 'Cancellation Reason', value: cancellationReason },
    ];

    if (customerName) {
        orderRows.push({ label: 'Customer Name', value: customerName });
    }

    if (customerEmail) {
        orderRows.push({ label: 'Customer Email', value: customerEmail });
    }

    if (vendorName) {
        orderRows.push({ label: 'Vendor Name', value: vendorName });
    }

    if (vendorEmail) {
        orderRows.push({ label: 'Vendor Email', value: vendorEmail });
    }

    return (
        <EmailLayout
            recipientName="Admin"
            previewText={`Order Cancelled - ${orderNumber}`}
        >
            <EmailHeader
                title="Order Cancelled 🚫"
                gradientFrom="#dc2626"
                gradientTo="#b91c1c"
            />

            <Section style={contentSection}>
                <Text style={greeting}>Hello Admin,</Text>
                <Text style={paragraph}>
                    An order has been cancelled by the vendor. Here is the cancellation summary for your
                    records and audit purposes.
                </Text>

                <Section style={infoBox}>
                    <Text style={infoText}>⚠️ Order Cancellation Alert</Text>
                </Section>

                <Heading style={sectionHeading}>Order Details</Heading>
                <DetailsTable rows={orderRows} />

                {refundAmount && refundAmount > 0 && (
                    <InfoBox
                        title="💰 Refund Processing"
                        content={`A refund of ${currency}${refundAmount.toFixed(2)} has been initiated for the customer. The refund typically takes 5-7 business days to reflect in their account.`}
                        variant="warning"
                    />
                )}

                <InfoBox
                    title="📊 Administrative Note"
                    content="This order has been cancelled. Ledger entries have been created to reverse the transaction and any associated fees. No further action is required unless customer support escalation is needed."
                    variant="info"
                />
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

const infoBox = {
    backgroundColor: '#fee2e2',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    textAlign: 'center' as const,
};

const infoText = {
    color: '#dc2626',
    fontSize: '16px',
    fontWeight: '600',
    margin: '0',
};

const sectionHeading = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333333',
    margin: '32px 0 16px 0',
};
