/**
 * TypeScript interfaces for email template props
 */

/**
 * Base email template props
 */
export interface BaseEmailProps {
  recipientName?: string;
  recipientEmail?: string;
  subject?: string;
}

/**
 * Email footer props
 */
export interface EmailFooterProps {
  companyName?: string;
  companyAddress?: string;
  unsubscribeUrl?: string;
  supportEmail?: string;
  websiteUrl?: string;
  year?: number;
}

/**
 * Details table row props
 */
export interface DetailsTableRow {
  label: string;
  value: string;
  isBold?: boolean;
}

/**
 * Details table props
 */
export interface DetailsTableProps {
  rows: DetailsTableRow[];
  showBorders?: boolean;
  backgroundColor?: string;
}

/**
 * Info box props
 */
export interface InfoBoxProps {
  title?: string;
  content: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  icon?: string;
}

/**
 * Button props
 */
export interface EmailButtonProps {
  text: string;
  href: string;
  backgroundColor?: string;
  textColor?: string;
}

/**
 * Order details props
 */
export interface OrderDetailsProps {
  orderId: string;
  orderDate: string;
  items: OrderItem[];
  totalAmount: string;
  currency?: string;
}

/**
 * Order item props
 */
export interface OrderItem {
  name: string;
  quantity: number;
  price: string;
}

/**
 * Payment details props
 */
export interface PaymentDetailsProps {
  paymentId: string;
  amount: string;
  currency?: string;
  paymentDate: string;
  paymentMethod: string;
  status: string;
}

/**
 * Subscription details props
 */
export interface SubscriptionDetailsProps {
  subscriptionId: string;
  planName: string;
  startDate: string;
  endDate: string;
  amount: string;
  currency?: string;
  billingCycle: 'monthly' | 'yearly' | 'weekly';
}

/**
 * Vendor payout details props
 */
export interface VendorPayoutDetailsProps {
  payoutId: string;
  vendorName: string;
  amount: string;
  currency?: string;
  payoutDate: string;
  bankAccount: string;
  status: string;
}

/**
 * Notification preferences props
 */
export interface NotificationPreferencesProps {
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  smsEnabled?: boolean;
}
