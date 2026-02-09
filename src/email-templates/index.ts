/**
 * Email templates module exports
 * Provides shared components, types, and utilities for creating TSX email templates
 */

// Components
export * from './components';

// Types
export * from './types';

// Utilities
export * from './utils';

// Templates
export {
  AdminOrderConfirmationTemplate,
  VendorOrderConfirmationTemplate,
} from './templates';

export type { AdminOrderConfirmationTemplateProps } from './templates/orders/admin-order-confirmation';
export type { VendorOrderConfirmationTemplateProps } from './templates/orders/vendor-order-confirmation';
