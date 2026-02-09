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
 * Props for CustomerOrderConfirmationTemplate
 */
export interface CustomerOrderConfirmationTemplateProps extends BaseEmailProps {
    customerName: string;
    orderId: string;
    orderNumber: string;
    formattedAmount: string;
    currency?: string;
    itemCount: number;
    paymentMode: string;
    orderDate: string;
    estimatedDeliveryTime?: string;
    deliveryAddress?: string;
    products?: Array<{
        name: string;
        quantity: number;
        price: number;
        unit?: string;
    }>;
    trackingUrl?: string;
}

/**
 * CustomerOrderConfirmationTemplate - Email sent to customer when order is created
 * Confirms order placement and provides order details
 */
export const CustomerOrderConfirmationTemplate: React.FC<
    CustomerOrderConfirmationTemplateProps
> = ({
    recipientName,
    customerName,
    orderId,
    orderNumber,
    formattedAmount,
    currency = '₹',
    itemCount,
    paymentMode,
    orderDate,
    estimatedDeliveryTime,
    deliveryAddress,
    products = [],
    trackingUrl,
}) => {
        const orderRows: DetailsTableRow[] = [
            { label: 'Order Number', value: orderNumber, isBold: true },
            { label: 'Order Date', value: orderDate },
            {
                label: 'Total Amount',
                value: `${formattedAmount}`,
                isBold: true,
            },
            { label: 'Payment Method', value: paymentMode },
            { label: 'Items', value: `${itemCount} item(s)` },
        ];

        if (estimatedDeliveryTime) {
            orderRows.push({
                label: 'Estimated Delivery',
                value: estimatedDeliveryTime,
            });
        }

        return (
            <EmailLayout
                recipientName={recipientName || customerName}
                previewText={`Order Confirmation - ${orderNumber}`}
            >
                <EmailHeader
                    title="Order Confirmed!"
                    gradientFrom="#3b82f6"
                    gradientTo="#2563eb"
                />

                <Section style={contentSection}>
                    <Text style={greeting}>Hello {customerName},</Text>
                    <Text style={paragraph}>
                        Thank you for your order! We've received your order and it's being
                        processed. You'll receive another email when your order is out for
                        delivery.
                    </Text>

                    <Heading style={sectionHeading}>Order Summary</Heading>
                    <DetailsTable rows={orderRows} />

                    {products.length > 0 && (
                        <Section style={productsSection}>
                            <Heading style={sectionHeading}>Order Items</Heading>
                            {products.map((product, index) => (
                                <Section key={index} style={productItem}>
                                    <Text style={productName}>
                                        {product.name} {product.unit ? `(${product.unit})` : ''}
                                    </Text>
                                    <Text style={productDetails}>
                                        Quantity: {product.quantity} × {currency}
                                        {product.price.toFixed(2)} = {currency}
                                        {(product.quantity * product.price).toFixed(2)}
                                    </Text>
                                </Section>
                            ))}
                        </Section>
                    )}

                    {deliveryAddress && (
                        <Section style={addressSection}>
                            <Heading style={sectionHeading}>Delivery Address</Heading>
                            <Text style={addressText}>{deliveryAddress}</Text>
                        </Section>
                    )}

                    <InfoBox
                        title="📱 What's Next?"
                        content="We'll notify you via push notification when your order is out for delivery. You can track your order status in the app anytime."
                        variant="info"
                    />

                    {trackingUrl && (
                        <Section style={buttonSection}>
                            <Button href={trackingUrl} style={button}>
                                Track Your Order
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
    borderLeft: '4px solid #3b82f6',
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

const addressSection = {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    margin: '20px 0',
};

const addressText = {
    fontSize: '14px',
    color: '#4b5563',
    margin: '0',
    whiteSpace: 'pre-line' as const,
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
