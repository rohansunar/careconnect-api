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
 * Props for AdminOrderDeliveredTemplate
 */
export interface AdminOrderDeliveredTemplateProps extends BaseEmailProps {
    orderId: string;
    orderNumber: string;
    formattedAmount: string;
    currency?: string;
    itemCount: number;
    paymentMode: string;
    deliveryDate: string;
    customerName?: string;
    customerEmail?: string;
    vendorName?: string;
    vendorEmail?: string;
    products?: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    adminDashboardUrl?: string;
}

/**
 * AdminOrderDeliveredTemplate - Email sent to admin when order is delivered
 * Provides order completion summary for admin records
 */
export const AdminOrderDeliveredTemplate: React.FC<AdminOrderDeliveredTemplateProps> = ({
    orderId,
    orderNumber,
    formattedAmount,
    currency = '₹',
    itemCount,
    paymentMode,
    deliveryDate,
    customerName,
    customerEmail,
    vendorName,
    vendorEmail,
    products = [],
    adminDashboardUrl,
}) => {
    const orderRows: DetailsTableRow[] = [
        { label: 'Order ID', value: orderId, isBold: false },
        { label: 'Order Number', value: orderNumber, isBold: true },
        { label: 'Delivered On', value: deliveryDate },
        {
            label: 'Order Value',
            value: `${formattedAmount}`,
            isBold: true,
        },
        { label: 'Payment Mode', value: paymentMode },
        { label: 'Items', value: `${itemCount} item(s)` },
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
            previewText={`Order Delivered - ${orderNumber}`}
        >
            <EmailHeader
                title="Order Completed ✅"
                gradientFrom="#7c3aed"
                gradientTo="#6d28d9"
            />

            <Section style={contentSection}>
                <Text style={greeting}>Hello Admin,</Text>
                <Text style={paragraph}>
                    An order has been successfully delivered. Here is the completion summary for your
                    records.
                </Text>

                <Section style={infoBox}>
                    <Text style={infoText}>📦 Order Completed Successfully</Text>
                </Section>

                <Heading style={sectionHeading}>Order Details</Heading>
                <DetailsTable rows={orderRows} />

                {products.length > 0 && (
                    <Section style={productsSection}>
                        <Heading style={sectionHeading}>Items Delivered</Heading>
                        {products.map((product, index) => (
                            <Section key={index} style={productItem}>
                                <Text style={productName}>{product.name}</Text>
                                <Text style={productDetails}>
                                    Qty: {product.quantity} × {currency}
                                    {product.price.toFixed(2)}
                                </Text>
                            </Section>
                        ))}
                    </Section>
                )}

                <InfoBox
                    title="📊 Administrative Note"
                    content="This order has been completed and the platform listing fee has been recorded in the ledger. No further action is required unless there are customer complaints."
                    variant="warning"
                />
            </Section>

            <EmailFooter
                companyName="Water Delivery System"
                supportEmail="support@waterdelivery.com"
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
    backgroundColor: '#f3e8ff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    textAlign: 'center' as const,
};

const infoText = {
    color: '#7c3aed',
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

const productsSection = {
    marginTop: '24px',
};

const productItem = {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '12px',
    borderLeft: '4px solid #7c3aed',
};

const productName = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 8px 0',
};

const productDetails = {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0',
};
