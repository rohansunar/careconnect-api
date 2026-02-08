import { Hr, Link, Section, Text } from '@react-email/components';
import React from 'react';
import type { EmailFooterProps } from '../types';

/**
 * EmailFooter - Reusable footer component
 * Displays company information, links, and unsubscribe option
 */
export const EmailFooter: React.FC<EmailFooterProps> = ({
  companyName = 'Water Delivery Service',
  companyAddress,
  unsubscribeUrl,
  supportEmail = 'support@waterdelivery.com',
  websiteUrl = 'https://waterdelivery.com',
  year = new Date().getFullYear(),
}) => {
  return (
    <Section style={footerSection}>
      <Hr style={hr} />
      <Text style={footerText}>
        © {year} {companyName}. All rights reserved.
      </Text>
      {companyAddress && <Text style={footerText}>{companyAddress}</Text>}
      <Text style={footerText}>
        Need help? Contact us at{' '}
        <Link href={`mailto:${supportEmail}`} style={link}>
          {supportEmail}
        </Link>
      </Text>
      <Text style={footerText}>
        Visit our website:{' '}
        <Link href={websiteUrl} style={link}>
          {websiteUrl}
        </Link>
      </Text>
      {unsubscribeUrl && (
        <Text style={unsubscribeText}>
          <Link href={unsubscribeUrl} style={unsubscribeLink}>
            Unsubscribe from these emails
          </Link>
        </Text>
      )}
    </Section>
  );
};

/**
 * Footer section styles
 */
const footerSection = {
  padding: '24px 20px',
  textAlign: 'center' as const,
  marginTop: '32px',
};

/**
 * Horizontal rule styles
 */
const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

/**
 * Footer text styles
 */
const footerText = {
  fontSize: '12px',
  lineHeight: '24px',
  color: '#525f7f',
  margin: '0 0 8px 0',
};

/**
 * Link styles
 */
const link = {
  color: '#3869d4',
  textDecoration: 'underline',
};

/**
 * Unsubscribe text styles
 */
const unsubscribeText = {
  fontSize: '12px',
  lineHeight: '24px',
  color: '#99aabb',
  margin: '16px 0 0 0',
};

/**
 * Unsubscribe link styles
 */
const unsubscribeLink = {
  color: '#99aabb',
  textDecoration: 'underline',
};
