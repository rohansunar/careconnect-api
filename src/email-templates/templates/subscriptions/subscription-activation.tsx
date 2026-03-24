import { Button, Heading, Section, Text } from '@react-email/components';
import React from 'react';
import type { BaseEmailProps, DetailsTableRow } from '../../types';
import { DetailsTable, EmailFooter, EmailHeader, EmailLayout, InfoBox } from '../../components';

export interface SubscriptionActivationTemplateProps extends BaseEmailProps {
    customerName: string;
    productName: string;
    frequency: string;
    nextDeliveryDate: string;
    formattedAmount: string;
    quantity?: number;
    manageUrl?: string;
}

export const SubscriptionActivationTemplate: React.FC<SubscriptionActivationTemplateProps> = ({
    recipientName,
    customerName,
    productName,
    frequency,
    nextDeliveryDate,
    formattedAmount,
    quantity = 1,
    manageUrl,
}) => {
    const rows: DetailsTableRow[] = [
        { label: 'Product', value: productName, isBold: true },
        { label: 'Frequency', value: frequency },
        { label: 'Next Delivery', value: nextDeliveryDate },
        { label: 'Amount', value: formattedAmount },
    ];

    return (
        <EmailLayout recipientName={recipientName || customerName} previewText={`Subscription Activated - ${productName}`}>
            <EmailHeader title="Subscription Activated!" gradientFrom="#8b5cf6" gradientTo="#7c3aed" />
            <Section style={contentSection}>
                <Text style={greeting}>Hello {customerName},</Text>
                <Text style={paragraph}>
                    Excellent! Your payment was successful and your subscription is now active. Get ready to receive your {productName} {frequency.toLowerCase()}.
                </Text>
                <Heading style={sectionHeading}>Active Subscription</Heading>
                <DetailsTable rows={rows} />
                <InfoBox
                    title="✨ Subscription Benefits"
                    content="• Never run out of water - automatic deliveries<br>• Save time - no need to reorder<br>• Flexible - pause or cancel anytime<br>• Priority support for subscribers"
                    variant="success"
                />
                {manageUrl && (
                    <Section style={buttonSection}>
                        <Button href={manageUrl} style={button}>Manage Subscription</Button>
                    </Section>
                )}
            </Section>
            <EmailFooter companyName="Water Delivery System" supportEmail="support@droptro.com" />
        </EmailLayout>
    );
};

const contentSection = { padding: '24px', backgroundColor: '#ffffff' };
const greeting = { fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#1f2937' };
const paragraph = { fontSize: '16px', lineHeight: '26px', color: '#4b5563', marginBottom: '25px' };
const sectionHeading = { fontSize: '20px', fontWeight: 'bold', color: '#333333', margin: '32px 0 16px 0' };
const buttonSection = { textAlign: 'center' as const, margin: '32px 0' };
const button = { backgroundColor: '#8b5cf6', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', display: 'inline-block' };
