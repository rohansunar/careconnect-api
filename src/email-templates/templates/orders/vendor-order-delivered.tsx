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
 * Props for VendorOrderDeliveredTemplate
 */
export interface VendorOrderDeliveredTemplateProps extends BaseEmailProps {
    vendorName: string;
    orderId: string;
    orderNumber: string;
    formattedAmount: string;
    currency?: string;
    itemCount: number;
    paymentMode: string;
    deliveryDate: string;
    customerName?: string;
    customerEmail?: string;
    products?: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    dashboardUrl?: string;
}

/**
 * VendorOrderDeliveredTemplate - Email sent to vendor when order is delivered
 * Confirms successful delivery and provides order summary
 */
export const VendorOrderDeliveredTemplate: React.FC<VendorOrderDeliveredTemplateProps> = ({
    recipientName,
    vendorName,
    orderId,
    orderNumber,
    formattedAmount,
    currency = '₹',
    itemCount,
    paymentMode,
    deliveryDate,
    customerName,
    customerEmail,
    products = [],
    dashboardUrl,
}) => {
    const orderRows: DetailsTableRow[] = [
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

    return (
        <EmailLayout
            recipientName={recipientName || vendorName}
            previewText={`Order Delivered - ${orderNumber}`}
        >
            <EmailHeader
                title="Order Successfully Delivered! 🎉"
                gradientFrom="#16a34a"
                gradientTo="#15803d"
            />

            <Section style={contentSection}>
                <Text style={greeting}>Hello {vendorName},</Text>
                <Text style={paragraph}>
                    Great work! Your order #{orderNumber} has been successfully delivered to the
                    customer. Thank you for fulfilling this order.
                </Text>

                <Section style={successBox}>
                    <Text style={successText}>✓ Order Successfully Completed</Text>
                </Section>

                <Heading style={sectionHeading}>Delivery Summary</Heading>
                <DetailsTable rows={orderRows} />

                {products.length > 0 && (
                    <Section style={productsSection}>
                        <Heading style={sectionHeading}>Items Delivered</Heading>
                        {products.map((product, index) => (
                            <Section key={index} style={productItem}>
                                <Text style={productName}>{product.name}</Text>
                                <Text style={productDetails}>
                                    Quantity: {product.quantity} × {currency}
                                    {product.price.toFixed(2)}
                                </Text>
                            </Section>
                        ))}
                    </Section>
                )}

                <InfoBox
                    title="📊 Track Your Performance"
                    content="Keep up the great work! Check your vendor dashboard for detailed analytics and insights."
                    variant="info"
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

const successBox = {
    backgroundColor: '#dcfce7',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    textAlign: 'center' as const,
};

const successText = {
    color: '#15803d',
    fontSize: '18px',
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
    borderLeft: '4px solid #16a34a',
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

const buttonSection = {
    textAlign: 'center' as const,
    margin: '32px 0',
};

const button = {
    backgroundColor: '#16a34a',
    color: '#ffffff',
    padding: '14px 28px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    display: 'inline-block',
};
