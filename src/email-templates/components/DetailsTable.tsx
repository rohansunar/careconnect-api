import { Column, Row, Section, Text } from '@react-email/components';
import React from 'react';
import type { DetailsTableProps } from '../types';

/**
 * DetailsTable - Reusable table component for displaying key-value pairs
 * Supports custom styling and optional borders
 */
export const DetailsTable: React.FC<DetailsTableProps> = ({
  rows,
  showBorders = true,
  backgroundColor = '#f7fafc',
}) => {
  return (
    <Section style={tableSection}>
      {rows.map((row, index) => (
        <Row key={index} style={rowStyle}>
          <Column style={labelColumn}>
            <Text style={labelText}>{row.label}</Text>
          </Column>
          <Column style={valueColumn}>
            <Text style={valueText(row.isBold)}>{row.value}</Text>
          </Column>
        </Row>
      ))}
    </Section>
  );
};

/**
 * Table section styles
 */
const tableSection = {
  padding: '20px',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #e6ebf1',
};

/**
 * Row styles
 */
const rowStyle = {
  borderBottom: '1px solid #e6ebf1',
};

/**
 * Label column styles
 */
const labelColumn = {
  width: '40%',
  verticalAlign: 'top' as const,
  padding: '12px 16px',
};

/**
 * Value column styles
 */
const valueColumn = {
  width: '60%',
  verticalAlign: 'top' as const,
  padding: '12px 16px',
};

/**
 * Label text styles
 */
const labelText = {
  fontSize: '14px',
  color: '#525f7f',
  fontWeight: '500',
  margin: '0',
};

/**
 * Value text styles
 */
const valueText = (isBold: boolean = false) => ({
  fontSize: '14px',
  color: '#333333',
  fontWeight: isBold ? '600' : '400',
  margin: '0',
});
