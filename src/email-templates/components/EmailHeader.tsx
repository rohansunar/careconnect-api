import { Heading, Img, Section, Text } from '@react-email/components';
import React from 'react';
/**
 * Email header props
 */
export interface EmailHeaderProps {
  title?: string;
  subtitle?: string;
  logoUrl?: string;
  showLogo?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
  backgroundColor?: string;
}

/**
 * EmailHeader - Reusable header component with gradient background
 * Displays logo, title, and optional subtitle
 */
export const EmailHeader: React.FC<EmailHeaderProps> = ({
  title = 'Water Delivery Service',
  subtitle,
  logoUrl,
  showLogo = true,
  gradientFrom = '#667eea',
  gradientTo = '#764ba2',
  backgroundColor,
}) => {
  const headerStyle = backgroundColor
    ? { ...headerSection, backgroundColor }
    : {
        ...headerSection,
        background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
      };

  return (
    <Section style={headerStyle}>
      {showLogo && (
        <div style={logoContainer}>
          {logoUrl ? (
            <Img src={logoUrl} alt="Logo" style={logo} />
          ) : (
            <div style={defaultLogo}>💧</div>
          )}
        </div>
      )}
      <Heading style={heading}>{title}</Heading>
      {subtitle && <Text style={subtitleText}>{subtitle}</Text>}
    </Section>
  );
};

/**
 * Header section styles with gradient background
 */
const headerSection = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: '40px 20px',
  textAlign: 'center' as const,
  borderRadius: '8px 8px 0 0',
};

/**
 * Logo container styles
 */
const logoContainer = {
  marginBottom: '16px',
};

/**
 * Logo image styles
 */
const logo = {
  width: '64px',
  height: '64px',
  margin: '0 auto',
  display: 'block',
};

/**
 * Default logo placeholder styles
 */
const defaultLogo = {
  fontSize: '48px',
  margin: '0 auto',
  display: 'inline-block',
};

/**
 * Heading text styles
 */
const heading = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
  lineHeight: '1.2',
};

/**
 * Subtitle text styles
 */
const subtitleText = {
  color: '#e0e7ff',
  fontSize: '16px',
  margin: '0',
  lineHeight: '1.5',
};
