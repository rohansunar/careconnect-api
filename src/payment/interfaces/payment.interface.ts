/**
 * Interface for payment initiation data
 */
export interface InitiatePaymentData {
  amount: number;
  currency: string;
  orderId: string;
  notes: any;
}

/**
 * Interface for payment provider response
 */
export interface ProviderResponse {
  provider: string;
  providerPaymentId: string;
  payload: any;
}

/**
 * Interface for webhook verification data
 */
export interface WebhookVerificationData {
  providerPaymentId: string;
  status: string;
}

/**
 * Interface for refund initiation data
 */
export interface InitiateRefundData {
  paymentId: string;
  amount: number;
  reason: string;
}

/**
 * Interface for refund provider response
 */
export interface RefundProviderResponse {
  refundId: string;
  status: string;
  payload: any;
}
