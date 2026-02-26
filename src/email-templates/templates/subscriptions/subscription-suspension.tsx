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

export interface SubscriptionSuspensionTemplateProps extends BaseEmailProps {
    customerName: string;
    subscriptionId: string;
    productName: string;
    frequency: string;
    nextDeliveryDate: string;
    formattedAmount: string;
    currentBalance: string;
    requiredAmount: string;
    shortfall: string;
    supportEmail?: string;
    manageUrl?: string;
}

export const SubscriptionSuspensionTemplate: React.FC<
    SubscriptionSuspensionTemplateProps
> = ({
    recipientName,
    customerName,
    subscriptionId,
    productName,
    frequency,
    nextDeliveryDate,
    formattedAmount,
    currentBalance,
    requiredAmount,
    shortfall,
    supportEmail = 'support@waterdelivery.com',
    manageUrl,
}) => {
        const subscriptionRows: DetailsTableRow[] = [
            { label: 'Product', value: productName, isBold: true },
            { label: 'Frequency', value: frequency },
            { label: 'Next Delivery', value: nextDeliveryDate },
            { label: 'Order Amount', value: formattedAmount, isBold: true },
        ];

        const walletRows: DetailsTableRow[] = [
            { label: 'Current Balance', value: currentBalance, isBold: true },
            { label: 'Required Amount', value: requiredAmount },
            { label: 'Shortfall', value: shortfall, isBold: true },
        ];

        return (
            <EmailLayout
                recipientName={recipientName || customerName}
                previewText={`Subscription Temporarily Paused - ${productName}`}
            >
                <EmailHeader
                    title="Subscription Temporarily Paused"
                    gradientFrom="#6b7280"
                    gradientTo="#4b5563"
                />

                <Section style={contentSection}>
                    <Text style={greeting}>Hello {customerName},</Text>
                    <Text style={paragraph}>
                        We hope this message finds you well. We're reaching out to let you know that your subscription for <strong>{productName}</strong> has been temporarily paused due to an insufficient wallet balance.
                    </Text>
                    <Text style={paragraph}>
                        We understand that unexpected situations can arise, and we want to assure you that your subscription is safe with us. Once your wallet is replenished, your deliveries will resume automatically without any interruption.
                    </Text>

                    <Heading style={sectionHeading}>Subscription Details</Heading>
                    <DetailsTable rows={subscriptionRows} />

                    <Heading style={sectionHeading}>Wallet Information</Heading>
                    <DetailsTable rows={walletRows} />

                    <InfoBox
                        title="What Happens Next?"
                        content="Your subscription is temporarily paused but not cancelled. To resume your deliveries, simply recharge your wallet when you're ready. There's no need to worry about missing out – we'll automatically process your next delivery once your wallet has sufficient funds."
                        variant="info"
                    />

                    {manageUrl && (
                        <Section style={buttonSection}>
                            <Text style={buttonText}>
                                You can manage your subscription or recharge your wallet anytime through your account.
                            </Text>
                        </Section>
                    )}

                    <Section style={helpSection}>
                        <Text style={helpTitle}>We're Here to Help</Text>
                        <Text style={helpText}>
                            If you have any questions or need assistance, please don't hesitate to reach out to our support team at{' '}
                            <a href={`mailto:${supportEmail}`} style={linkStyle}>{supportEmail}</a>. We're committed to ensuring your experience with us is seamless and satisfactory.
                        </Text>
                    </Section>
                </Section>

                <EmailFooter
                    companyName="Water Delivery System"
                    supportEmail={supportEmail}
                />
            </EmailLayout>
        );
    };

const contentSection = { padding: '24px', backgroundColor: '#ffffff' };
const greeting = { fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#1f2937' };
const paragraph = { fontSize: '16px', lineHeight: '26px', color: '#4b5563', marginBottom: '25px' };
const sectionHeading = { fontSize: '20px', fontWeight: 'bold', color: '#333333', margin: '32px 0 16px 0' };
const buttonSection = { textAlign: 'center' as const, margin: '32px 0' };
const buttonText = { fontSize: '14px', color: '#6b7280', margin: '0', lineHeight: '1.6' };
const helpSection = { padding: '20px', backgroundColor: '#f3f4f6', borderRadius: '8px', margin: '24px 0' };
const helpTitle = { fontSize: '16px', fontWeight: '600', color: '#374151', margin: '0 0 12px 0' };
const helpText = { fontSize: '14px', color: '#6b7280', margin: '0', lineHeight: '1.6' };
const linkStyle = { color: '#4f46e5', textDecoration: 'underline' };
