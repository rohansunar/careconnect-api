import { Button, Heading, Section, Text } from '@react-email/components';
import React from 'react';
import type { BaseEmailProps, DetailsTableRow } from '../types';
import {
  DetailsTable,
  EmailFooter,
  EmailHeader,
  EmailLayout,
  InfoBox,
} from '../components';

/**
 * Props for VendorOrderConfirmationTemplate
 */
export interface VendorOrderConfirmationTemplateProps extends BaseEmailProps {
  vendorName: string;
  orderId: string;
  orderNumber: string;
  formattedAmount: string;
  currency?: string;
  itemCount: number;
  paymentMode: string;
  orderDate: string;
  estimatedDeliveryTime?: string;
  customerName?: string;
  customerEmail?: string;
  deliveryAddress?: string;
  dashboardUrl: string;
}

/**
 * VendorOrderConfirmationTemplate - Email template for vendor order confirmation
 * Notifies vendor of new orders with complete order details
 */
export const VendorOrderConfirmationTemplate: React.FC<
  VendorOrderConfirmationTemplateProps
> = ({
  recipientName,
  vendorName,
  orderId,
  orderNumber,
  formattedAmount,
  currency = '₹',
  itemCount,
  paymentMode,
  orderDate,
  estimatedDeliveryTime,
  customerName,
  customerEmail,
  deliveryAddress,
  dashboardUrl,
}) => {
  const orderRows: DetailsTableRow[] = [
    { label: 'Order ID', value: orderId },
    { label: 'Order Number', value: orderNumber },
    {
      label: 'Total Amount',
      value: `${formattedAmount} ${currency}`,
      isBold: true,
    },
    { label: 'Items in Order', value: `${itemCount} item(s)` },
    { label: 'Payment Mode', value: paymentMode },
    { label: 'Order Date', value: orderDate },
  ];

  if (estimatedDeliveryTime) {
    orderRows.push({
      label: 'Estimated Delivery',
      value: estimatedDeliveryTime,
    });
  }

  return (
    <EmailLayout
      recipientName={recipientName || vendorName}
      previewText={`New order received: ${orderNumber}`}
    >
      <EmailHeader
        title="New Order Received!"
        gradientFrom="#22c55e"
        gradientTo="#16a34a"
      />

      <Section style={contentSection}>
        <Text style={greeting}>Hello {vendorName},</Text>
        <Text style={paragraph}>
          Great news! You have received a new order. Please review the order
          details and prepare for fulfillment.
        </Text>

        <Heading style={sectionHeading}>Order Details</Heading>
        <DetailsTable rows={orderRows} />

        {customerName && (
          <Section style={infoSection}>
            <Heading style={infoSectionHeading}>Customer Information</Heading>
            <Text style={infoItem}>
              <span style={infoLabel}>Customer Name:</span> {customerName}
            </Text>
            {customerEmail && (
              <Text style={infoItem}>
                <span style={infoLabel}>Customer Email:</span> {customerEmail}
              </Text>
            )}
          </Section>
        )}

        {deliveryAddress && (
          <Section style={infoSection}>
            <Heading style={infoSectionHeading}>Delivery Address</Heading>
            <Text style={addressText}>{deliveryAddress}</Text>
          </Section>
        )}

        <InfoBox
          title="📋 Next Steps"
          content="• Review order details in your dashboard<br>• Prepare the items for fulfillment<br>• Update order status as needed"
          variant="success"
        />

        <Section style={buttonSection}>
          <Button href={dashboardUrl} style={button}>
            View Order Details
          </Button>
        </Section>
      </Section>

      <EmailFooter
        companyName="Water Delivery System"
        supportEmail="support@waterdelivery.com"
      />
    </EmailLayout>
  );
};

/**
 * Content section styles
 */
const contentSection = {
  padding: '24px',
  backgroundColor: '#ffffff',
};

/**
 * Greeting text styles
 */
const greeting = {
  fontSize: '18px',
  fontWeight: '600',
  marginBottom: '20px',
  color: '#1f2937',
};

/**
 * Paragraph text styles
 */
const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#4b5563',
  marginBottom: '25px',
};

/**
 * Section heading styles
 */
const sectionHeading = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#333333',
  margin: '32px 0 16px 0',
};

/**
 * Info section styles
 */
const infoSection = {
  padding: '20px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  margin: '20px 0',
};

/**
 * Info section heading styles
 */
const infoSectionHeading = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#374151',
  margin: '0 0 15px 0',
};

/**
 * Info item styles
 */
const infoItem = {
  fontSize: '14px',
  color: '#4b5563',
  margin: '8px 0',
  display: 'flex',
  justifyContent: 'space-between',
  borderBottom: '1px solid #e5e7eb',
  paddingBottom: '8px',
};

/**
 * Info label styles
 */
const infoLabel = {
  fontWeight: '500',
  color: '#374151',
};

/**
 * Address text styles
 */
const addressText = {
  fontSize: '14px',
  color: '#4b5563',
  margin: '0',
  whiteSpace: 'pre-line' as const,
};

/**
 * Button section styles
 */
const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

/**
 * Button styles
 */
const button = {
  backgroundColor: '#22c55e',
  color: '#ffffff',
  padding: '14px 28px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: '600',
  display: 'inline-block',
};
