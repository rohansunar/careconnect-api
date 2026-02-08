import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import React from 'react';

/**
 * Props for EmailLayout component
 */
export interface EmailLayoutProps {
  children: React.ReactNode;
  previewText?: string;
  recipientName?: string;
}

/**
 * EmailLayout - Base layout component for all email templates
 * Provides consistent structure with Html, Head, Body, and Container
 */
export const EmailLayout: React.FC<EmailLayoutProps> = ({
  children,
  previewText,
  recipientName,
}) => {
  return (
    <Html>
      <Head />
      {previewText && <Preview>{previewText}</Preview>}
      <Body style={main}>
        <Container style={container}>
          {recipientName && (
            <Text style={greeting}>Hello {recipientName},</Text>
          )}
          {children}
        </Container>
      </Body>
    </Html>
  );
};

/**
 * Main body styles
 */
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

/**
 * Container styles
 */
const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

/**
 * Greeting text styles
 */
const greeting = {
  fontSize: '16px',
  lineHeight: '26px',
  marginBottom: '24px',
  color: '#333333',
};
