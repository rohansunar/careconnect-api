# Razorpay Integration Plan

## Overview
This plan outlines the integration of Razorpay order creation logic into the existing payment service while adhering to SOLID principles. The goal is to extend the `PaymentProviderService` to support Razorpay without modifying the existing `PaymentService` or disrupting current functionality.

## Current Implementation Analysis

### `PaymentService`
- The `create` function orchestrates payment creation, cart validation, and order creation.
- It delegates payment provider interactions to `PaymentProviderService`.
- Supports multiple payment modes: `ONLINE`, `COD`, and `MONTHLY`.
- For `ONLINE` mode, it initiates payment with the provider and checks out the cart.
- For `COD` or `MONTHLY`, it creates an order and links the payment to it.

### `PaymentProviderService`
- Currently supports a mock payment provider.
- Includes placeholder methods for Razorpay integration (`initiateRazorpayPayment`, `verifyRazorpayWebhook`, `initiateRazorpayRefund`).
- Uses a strategy pattern to switch between providers based on configuration.

## Design Plan

### Step 1: Implement Razorpay Integration in `PaymentProviderService`
- **Objective**: Implement the Razorpay-specific methods (`initiateRazorpayPayment`, `verifyRazorpayWebhook`, `initiateRazorpayRefund`).
- **Approach**:
  - Use the Razorpay SDK to create orders, verify webhooks, and initiate refunds.
  - Ensure the Razorpay implementation adheres to the existing interfaces (`ProviderResponse`, `WebhookVerificationData`, `RefundProviderResponse`).
  - Handle errors gracefully and log appropriately.

### Step 2: Update Configuration
- **Objective**: Ensure the `PAYMENT_PROVIDER` environment variable can be set to `RAZORPAY`.
- **Approach**:
  - Verify that the configuration service is properly set up to read the `PAYMENT_PROVIDER` variable.
  - Ensure the Razorpay API keys are available in the environment variables.

### Step 3: Test the Integration
- **Objective**: Validate that the Razorpay integration works seamlessly with the existing `PaymentService`.
- **Approach**:
  - Write unit tests for the Razorpay methods in `PaymentProviderService`.
  - Test the integration with the `PaymentService` to ensure no existing functionality is disrupted.
  - Verify that the `create` function in `PaymentService` works as expected with Razorpay.

### Step 4: Identify and Remove Redundancies
- **Objective**: Identify and remove any redundant variables, files, folders, test files, or code.
- **Approach**:
  - Review the codebase for unused variables, imports, or files.
  - Ensure all code adheres to the SOLID principles and is modular, testable, and reusable.

## SOLID Principles Adherence

### Single Responsibility Principle (SRP)
- `PaymentService`: Responsible for orchestrating payment creation and order management.
- `PaymentProviderService`: Responsible for interacting with payment providers (Razorpay, Mock).

### Open/Closed Principle (OCP)
- The `PaymentProviderService` is open for extension (adding new providers) but closed for modification (existing code remains unchanged).

### Liskov Substitution Principle (LSP)
- The Razorpay implementation will adhere to the same interfaces as the mock provider, ensuring substitutability.

### Interface Segregation Principle (ISP)
- Interfaces are small and focused on specific tasks (e.g., `InitiatePaymentData`, `ProviderResponse`).

### Dependency Inversion Principle (DIP)
- High-level modules (`PaymentService`) depend on abstractions (`PaymentProviderService`) rather than concrete implementations.

## Implementation Details

### Razorpay Order Creation
- The `initiateRazorpayPayment` method will:
  - Use the Razorpay SDK to create an order.
  - Return a `ProviderResponse` with the Razorpay order ID and relevant details.
  - Handle errors and log them appropriately.

### Razorpay Webhook Verification
- The `verifyRazorpayWebhook` method will:
  - Verify the authenticity of the webhook using Razorpay's signature verification.
  - Extract the payment ID and status from the webhook payload.
  - Return a `WebhookVerificationData` object.

### Razorpay Refund Initiation
- The `initiateRazorpayRefund` method will:
  - Use the Razorpay SDK to initiate a refund for the specified payment.
  - Return a `RefundProviderResponse` with the refund ID and status.
  - Handle errors and log them appropriately.

## Next Steps
1. Implement the Razorpay methods in `PaymentProviderService`.
2. Update the configuration to support Razorpay.
3. Test the integration thoroughly.
4. Identify and remove redundancies.

## Mermaid Diagram

```mermaid
graph TD
    A[PaymentService.create] --> B[PaymentProviderService.initiatePayment]
    B --> C{Razorpay?}
    C -->|Yes| D[initiateRazorpayPayment]
    C -->|No| E[initiateMockPayment]
    D --> F[Razorpay SDK]
    F --> G[Create Order]
    G --> H[Return ProviderResponse]