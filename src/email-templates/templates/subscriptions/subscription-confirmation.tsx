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

export interface SubscriptionConfirmationTemplateProps extends BaseEmailProps {
    customerName: string;
    subscriptionId: string;
    productName: string;
    frequency: string;
    nextDeliveryDate: string;
    formattedAmount: string;
    currency?: string;
    quantity?: number;
    startDate: string;
    manageUrl?: string;
}

export const SubscriptionConfirmationTemplate: React.FC<
    SubscriptionConfirmationTemplateProps
> = ({
    recipientName,
    customerName,
    subscriptionId,
    productName,
    frequency,
    nextDeliveryDate,
    formattedAmount,
    currency = '₹',
    quantity = 1,
    startDate,
    manageUrl,
}) => {
        const subscriptionRows: DetailsTableRow[] = [
            { label: 'Product', value: productName, isBold: true },
            { label: 'Quantity', value: `${quantity} unit(s)` },
            { label: 'Frequency', value: frequency },
            { label: 'Amount', value: formattedAmount, isBold: true },
            { label: 'Start Date', value: startDate },
            { label: 'Next Delivery', value: nextDeliveryDate },
        ];

        return (
            <EmailLayout
                recipientName={recipientName || customerName}
                previewText={`Subscription Confirmed - ${productName}`}
            >
                <EmailHeader
                    title="Subscription Confirmed!"
                    gradientFrom="#10b981"
                    gradientTo="#059669"
                />

                <Section style={contentSection}>
                    <Text style={greeting}>Hello {customerName},</Text>
                    <Text style={paragraph}>
                        Great news! Your subscription has been created successfully. We'll
                        process your payment and activate your subscription shortly.
                    </Text>

                    <Heading style={sectionHeading}>Subscription Details</Heading>
                    <DetailsTable rows={subscriptionRows} />

                    <InfoBox
                        title="🔄 What Happens Next?"
                        content="We'll process your first payment and send you a confirmation email once your subscription is active. Your deliveries will begin according to the schedule above."
                        variant="success"
                    />

                    <Section style={highlightSection}>
                        <Heading style={highlightHeading}>📅 Your Delivery Schedule</Heading>
                        <Text style={highlightText}>
                            You'll receive your {productName} {frequency.toLowerCase()}. Your
                            first delivery is scheduled for {nextDeliveryDate}.
                        </Text>
                    </Section>

                    {manageUrl && (
                        <Section style={buttonSection}>
                            <Button href={manageUrl} style={button}>
                                Manage Subscription
                            </Button>
                        </Section>
                    )}
                </Section>

                <EmailFooter
                    companyName="Water Delivery System"
                    supportEmail="support@droptro.com"
                />
            </EmailLayout>
        );
    };

const contentSection = { padding: '24px', backgroundColor: '#ffffff' };
const greeting = { fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#1f2937' };
const paragraph = { fontSize: '16px', lineHeight: '26px', color: '#4b5563', marginBottom: '25px' };
const sectionHeading = { fontSize: '20px', fontWeight: 'bold', color: '#333333', margin: '32px 0 16px 0' };
const highlightSection = { padding: '20px', backgroundColor: '#ecfdf5', borderRadius: '8px', margin: '24px 0', borderLeft: '4px solid #10b981' };
const highlightHeading = { fontSize: '16px', fontWeight: '600', color: '#065f46', margin: '0 0 12px 0' };
const highlightText = { fontSize: '14px', color: '#047857', margin: '0' };
const buttonSection = { textAlign: 'center' as const, margin: '32px 0' };
const button = { backgroundColor: '#10b981', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', display: 'inline-block' };
