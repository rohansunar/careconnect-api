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
 * Props for AdminOrderConfirmationTemplate
 */
export interface AdminOrderConfirmationTemplateProps extends BaseEmailProps {
  orderId: string;
  orderNumber: string;
  formattedAmount: string;
  currency?: string;
  itemCount: number;
  paymentMode: string;
  vendorName: string;
  orderDate: string;
  estimatedDeliveryTime?: string;
  customerName?: string;
  customerEmail?: string;
  deliveryAddress?: string;
  adminDashboardUrl: string;
}

/**
 * AdminOrderConfirmationTemplate - Email template for admin order confirmation
 * Notifies admin of new orders with complete order details
 */
export const AdminOrderConfirmationTemplate: React.FC<
  AdminOrderConfirmationTemplateProps
> = ({
  recipientName = 'Admin',
  orderId,
  orderNumber,
  formattedAmount,
  currency = '₹',
  itemCount,
  paymentMode,
  vendorName,
  orderDate,
  estimatedDeliveryTime,
  customerName,
  customerEmail,
  deliveryAddress,
  adminDashboardUrl,
}) => {
  const orderRows: DetailsTableRow[] = [
    { label: 'Order ID', value: orderId },
    { label: 'Order Number', value: orderNumber },
    {
      label: 'Total Amount',
      value: `${formattedAmount} ${currency}`,
      isBold: true,
    },
    { label: 'Items Count', value: `${itemCount} item(s)` },
    { label: 'Payment Mode', value: paymentMode },
    { label: 'Vendor', value: vendorName },
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
      recipientName={recipientName}
      previewText={`New order received: ${orderNumber}`}
    >
      <EmailHeader
        title="New Order Received"
        subtitle="📢 New Order Confirmation"
        gradientFrom="#3b82f6"
        gradientTo="#1d4ed8"
      />

      <Section style={contentSection}>
        <Text style={paragraph}>
          A new order has been placed in the system. Please review the details
          below.
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
          title="📋 Admin Actions"
          content="• Review order details in the admin dashboard<br>• Monitor order fulfillment status<br>• Coordinate with vendor if needed"
          variant="info"
        />

        <Section style={buttonSection}>
          <Button href={adminDashboardUrl} style={button}>
            Open Admin Dashboard
          </Button>
        </Section>
      </Section>

      <EmailFooter
        companyName="Water Delivery System - Admin Panel"
        supportEmail="admin@waterdelivery.com"
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
 * Paragraph text styles
 */
const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#333333',
  marginBottom: '24px',
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
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: '600',
  display: 'inline-block',
};
