import { Button, Heading, Section, Text } from '@react-email/components';
import React from 'react';
import type { BaseEmailProps, DetailsTableRow } from '../../types';
import { DetailsTable, EmailFooter, EmailHeader, EmailLayout, InfoBox } from '../../components';

export interface SubscriptionRenewalReminderTemplateProps extends BaseEmailProps {
    customerName: string;
    productName: string;
    renewalDate: string;
    formattedAmount: string;
    paymentMethod?: string;
    updatePaymentUrl?: string;
    manageUrl?: string;
}

export const SubscriptionRenewalReminderTemplate: React.FC<SubscriptionRenewalReminderTemplateProps> = ({
    recipientName,
    customerName,
    productName,
    renewalDate,
    formattedAmount,
    paymentMethod,
    updatePaymentUrl,
    manageUrl,
}) => {
    const rows: DetailsTableRow[] = [
        { label: 'Product', value: productName, isBold: true },
        { label: 'Renewal Date', value: renewalDate, isBold: true },
        { label: 'Amount', value: formattedAmount },
    ];

    if (paymentMethod) {
        rows.push({ label: 'Payment Method', value: paymentMethod });
    }

    return (
        <EmailLayout recipientName={recipientName || customerName} previewText={`Subscription Renewal Reminder - ${productName}`}>
            <EmailHeader title="Subscription Renewal Reminder" gradientFrom="#f59e0b" gradientTo="#d97706" />
            <Section style={contentSection}>
                <Text style={greeting}>Hello {customerName},</Text>
                <Text style={paragraph}>
                    This is a friendly reminder that your subscription will renew in 3 days. We'll automatically charge your payment method on file.
                </Text>
                <Heading style={sectionHeading}>Renewal Details</Heading>
                <DetailsTable rows={rows} />
                <InfoBox
                    title="⚠️ Action Required?"
                    content="If your payment method has changed or you'd like to update your subscription, please do so before the renewal date to avoid any service interruption."
                    variant="warning"
                />
                <Section style={buttonContainer}>
                    {updatePaymentUrl && (
                        <Button href={updatePaymentUrl} style={buttonSecondary}>Update Payment Method</Button>
                    )}
                    {manageUrl && (
                        <Button href={manageUrl} style={buttonPrimary}>Manage Subscription</Button>
                    )}
                </Section>
            </Section>
            <EmailFooter companyName="Water Delivery System" supportEmail="support@droptro.com" />
        </EmailLayout>
    );
};

const contentSection = { padding: '24px', backgroundColor: '#ffffff' };
const greeting = { fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#1f2937' };
const paragraph = { fontSize: '16px', lineHeight: '26px', color: '#4b5563', marginBottom: '25px' };
const sectionHeading = { fontSize: '20px', fontWeight: 'bold', color: '#333333', margin: '32px 0 16px 0' };
const buttonContainer = { textAlign: 'center' as const, margin: '32px 0' };
const buttonPrimary = { backgroundColor: '#f59e0b', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', display: 'inline-block', margin: '0 8px' };
const buttonSecondary = { backgroundColor: '#6b7280', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', display: 'inline-block', margin: '0 8px' };
