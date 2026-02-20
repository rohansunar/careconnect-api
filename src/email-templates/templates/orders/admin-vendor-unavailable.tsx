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
 * Props for AdminVendorUnavailableTemplate
 */
export interface AdminVendorUnavailableTemplateProps extends BaseEmailProps {
  subscriptionId: string;
  timestamp: string;
  productName: string;
  price: string;
  quantity: number;
  vendorName: string;
  vendorAvailableToday: boolean;
  customerId: string;
  customerName: string;
  customerPhone: string;
  totalPrice: string;
  deliveryAddress?: string;
  adminDashboardUrl: string;
}

/**
 * AdminVendorUnavailableTemplate - Email template for admin notification when vendor is unavailable
 * Notifies admin that an order requires manual processing due to vendor unavailability
 */
export const AdminVendorUnavailableTemplate: React.FC<
  AdminVendorUnavailableTemplateProps
> = ({
  subscriptionId,
  timestamp,
  productName,
  price,
  quantity,
  vendorName,
  vendorAvailableToday,
  customerId,
  customerName,
  customerPhone,
  totalPrice,
  deliveryAddress,
  adminDashboardUrl,
}) => {
    const orderRows: DetailsTableRow[] = [
      { label: 'Subscription ID', value: subscriptionId },
      { label: 'Timestamp', value: timestamp },
    ];

    const productRows: DetailsTableRow[] = [
      { label: 'Product Name', value: productName },
      { label: 'Price', value: price },
      { label: 'Quantity', value: `${quantity}` },
    ];

    const vendorRows: DetailsTableRow[] = [
      { label: 'Vendor Name', value: vendorName },
      { label: 'Vendor Available Today', value: vendorAvailableToday ? 'Yes' : 'No' },
    ];

    const customerRows: DetailsTableRow[] = [
      { label: 'Customer ID', value: customerId },
      { label: 'Customer Name', value: customerName || 'N/A' },
      { label: 'Customer Phone', value: customerPhone || 'N/A' },
      { label: 'Total Price', value: totalPrice, isBold: true },
    ];

    return (
      <EmailLayout
        previewText={`Action Required: Manual Order Processing Needed - ${vendorName}`}
      >
        <EmailHeader
          title="Manual Order Processing Required"
          subtitle="⚠️ Vendor Unavailable"
          gradientFrom="#f59e0b"
          gradientTo="#d97706"
        />

        <Section style={contentSection}>
          <Text style={paragraph}>
            The following order has been created but requires manual processing because the vendor is unavailable today.
          </Text>

          <Heading style={sectionHeading}>Order Details</Heading>
          <DetailsTable rows={orderRows} />

          <Heading style={sectionHeading}>Product Information</Heading>
          <DetailsTable rows={productRows} />

          <Heading style={sectionHeading}>Vendor Information</Heading>
          <DetailsTable rows={vendorRows} />

          <Section style={infoSection}>
            <Heading style={infoSectionHeading}>Customer Information</Heading>
            <Text style={infoItem}>
              <span style={infoLabel}>Customer ID:</span> {customerId}
            </Text>
            <Text style={infoItem}>
              <span style={infoLabel}>Customer Name:</span> {customerName || 'N/A'}
            </Text>
            <Text style={infoItem}>
              <span style={infoLabel}>Customer Phone:</span> {customerPhone || 'N/A'}
            </Text>
            <Text style={infoItem}>
              <span style={infoLabel}>Total Price:</span> {totalPrice}
            </Text>
          </Section>

          {deliveryAddress && (
            <Section style={infoSection}>
              <Heading style={infoSectionHeading}>Delivery Address</Heading>
              <Text style={addressText}>{deliveryAddress}</Text>
            </Section>
          )}

          <InfoBox
            title="📋 Required Action"
            content="Please process this order manually or reschedule as needed. Contact the vendor or customer if necessary."
            variant="warning"
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
  backgroundColor: '#f59e0b',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: '600',
  display: 'inline-block',
};
