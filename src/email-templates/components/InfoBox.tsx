import { Section, Text } from '@react-email/components';
import React from 'react';
import type { InfoBoxProps } from '../types';

/**
 * InfoBox - Reusable info box component with variant-based styling
 * Supports info, success, warning, and error variants
 */
export const InfoBox: React.FC<InfoBoxProps> = ({
  title,
  content,
  variant = 'info',
  icon,
}) => {
  const variantStyles = getVariantStyles(variant);
  const iconDisplay = icon || getVariantIcon(variant);

  return (
    <Section style={infoBoxSection(variantStyles)}>
      {iconDisplay && <Text style={iconStyle}>{iconDisplay}</Text>}
      {title && <Text style={titleStyle(variantStyles)}>{title}</Text>}
      <Text style={contentStyle}>{content}</Text>
    </Section>
  );
};

/**
 * Get variant-specific styles
 */
const getVariantStyles = (variant: InfoBoxProps['variant']) => {
  const styles = {
    info: {
      backgroundColor: '#e3f2fd',
      borderColor: '#2196f3',
      textColor: '#0d47a1',
    },
    success: {
      backgroundColor: '#e8f5e9',
      borderColor: '#4caf50',
      textColor: '#1b5e20',
    },
    warning: {
      backgroundColor: '#fff3e0',
      borderColor: '#ff9800',
      textColor: '#e65100',
    },
    error: {
      backgroundColor: '#ffebee',
      borderColor: '#f44336',
      textColor: '#b71c1c',
    },
  };
  return styles[variant || 'info'];
};

/**
 * Get variant-specific icon
 */
const getVariantIcon = (variant: InfoBoxProps['variant']) => {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };
  return icons[variant || 'info'];
};

/**
 * Info box section styles
 */
const infoBoxSection = (
  variantStyles: ReturnType<typeof getVariantStyles>,
) => ({
  padding: '20px',
  backgroundColor: variantStyles.backgroundColor,
  borderLeft: `4px solid ${variantStyles.borderColor}`,
  borderRadius: '4px',
  margin: '24px 0',
});

/**
 * Icon styles
 */
const iconStyle = {
  fontSize: '24px',
  marginBottom: '12px',
  display: 'block',
};

/**
 * Title styles
 */
const titleStyle = (variantStyles: ReturnType<typeof getVariantStyles>) => ({
  fontSize: '16px',
  fontWeight: '600',
  color: variantStyles.textColor,
  margin: '0 0 8px 0',
});

/**
 * Content styles
 */
const contentStyle = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#333333',
  margin: '0',
};
