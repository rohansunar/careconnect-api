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
 * Props for CustomerOrderDeliveredTemplate
 */
export interface CustomerOrderDeliveredTemplateProps extends BaseEmailProps {
    customerName: string;
    orderId: string;
    orderNumber: string;
    formattedAmount: string;
    currency?: string;
    itemCount: number;
    paymentMode: string;
    deliveryDate: string;
    deliveryAddress?: string;
    products?: Array<{
        name: string;
        quantity: number;
        price: number;
        unit?: string;
    }>;
    feedbackUrl?: string;
}

/**
 * CustomerOrderDeliveredTemplate - Email sent to customer when order is delivered
 * Confirms successful delivery and encourages feedback
 */
export const CustomerOrderDeliveredTemplate: React.FC<CustomerOrderDeliveredTemplateProps> = ({
    recipientName,
    customerName,
    orderId,
    orderNumber,
    formattedAmount,
    currency = '₹',
    itemCount,
    paymentMode,
    deliveryDate,
    deliveryAddress,
    products = [],
    feedbackUrl,
}) => {
    const orderRows: DetailsTableRow[] = [
        { label: 'Order Number', value: orderNumber, isBold: true },
        { label: 'Delivered On', value: deliveryDate },
        {
            label: 'Total Amount',
            value: `${formattedAmount}`,
            isBold: true,
        },
        { label: 'Payment Method', value: paymentMode },
        { label: 'Items', value: `${itemCount} item(s)` },
    ];

    return (
        <EmailLayout
            recipientName={recipientName || customerName}
            previewText={`Order Delivered - ${orderNumber}`}
        >
            <EmailHeader
                title="Order Delivered! ✅"
                gradientFrom="#16a34a"
                gradientTo="#15803d"
            />

            <Section style={contentSection}>
                <Text style={greeting}>Hello {customerName},</Text>
                <Text style={paragraph}>
                    Great news! Your order has been successfully delivered. We hope you enjoy your
                    purchase. Thank you for ordering with us!
                </Text>

                <Section style={successBox}>
                    <Text style={successText}>✓ Order Successfully Delivered</Text>
                </Section>

                <Heading style={sectionHeading}>Delivery Summary</Heading>
                <DetailsTable rows={orderRows} />

                {products.length > 0 && (
                    <Section style={productsSection}>
                        <Heading style={sectionHeading}>Items Delivered</Heading>
                        {products.map((product, index) => (
                            <Section key={index} style={productItem}>
                                <Text style={productName}>
                                    {product.name} {product.unit ? `(${product.unit})` : ''}
                                </Text>
                                <Text style={productDetails}>
                                    Quantity: {product.quantity} × {currency}
                                    {product.price.toFixed(2)}
                                </Text>
                            </Section>
                        ))}
                    </Section>
                )}

                {deliveryAddress && (
                    <Section style={addressSection}>
                        <Heading style={sectionHeading}>Delivered To</Heading>
                        <Text style={addressText}>{deliveryAddress}</Text>
                    </Section>
                )}

                <InfoBox
                    title="💬 We'd Love Your Feedback!"
                    content="Your feedback helps us improve our service. Please take a moment to rate your experience."
                    variant="success"
                />

                {feedbackUrl && (
                    <Section style={buttonSection}>
                        <Button href={feedbackUrl} style={button}>
                            Share Feedback
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
    backgroundColor: '#16a34a',
    color: '#ffffff',
    padding: '14px 28px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    display: 'inline-block',
};
