# Admin-Controlled Subscription Payment Modes

## Overview
This document outlines the implementation and documentation of admin-controlled subscription payment modes (prepaid/postpaid) with seamless feature alignment during transitions. The system supports two distinct scenarios: 1) customers making upfront payments for subscriptions, and 2) customers paying after service deliveries. The update includes comprehensive admin controls for toggling payment modes, validating transitions, and maintaining feature parity across states.

## Table of Contents
1. [Payment Modes Overview](#payment-modes-overview)
2. [Admin Controls for Payment Modes](#admin-controls-for-payment-modes)
3. [Feature Alignment During Transitions](#feature-alignment-during-transitions)
4. [Edge Case Handling](#edge-case-handling)
5. [Test Scenarios](#test-scenarios)
6. [Escalation Workflows](#escalation-workflows)
7. [API Contracts](#api-contracts)
8. [Validation Rules](#validation-rules)
9. [System Behaviors](#system-behaviors)

## Payment Modes Overview

### Prepaid Mode
- **Description**: Customers make upfront payments for subscriptions before receiving any services.
- **Use Case**: Ideal for customers who prefer to pay in advance and avoid recurring payments.
- **Admin Controls**: Admins can enable/disable prepaid mode, set payment terms, and validate transitions.

### Postpaid Mode
- **Description**: Customers pay for subscriptions after receiving services.
- **Use Case**: Suitable for customers who prefer to pay based on actual usage or service delivery.
- **Admin Controls**: Admins can enable/disable postpaid mode, set billing cycles, and validate transitions.

### Default Payment Mode Configuration
- **Description**: The system automatically creates a default configuration file at `/home/rohan/Desktop/water-v2/api/dist/src/subscription/config/payment-mode.config.json` with a default value of `"UPFRONT"` if the file does not exist. This ensures seamless fallback behavior and maintains existing functionality.
- **Implementation Details**:
  - The directory structure is created if it does not exist.
  - Atomic and thread-safe file creation is implemented.
  - Robust error handling logs file creation events and potential filesystem errors.
  - The operation is designed to be atomic and thread-safe to handle concurrent access gracefully.

## Admin Controls for Payment Modes

### Toggling Payment Modes
- **Endpoint**: `POST /admin/subscriptions/{id}/toggle-payment-mode`
- **Request Body**:
  ```json
  {
    "paymentMode": "PREPAID | POSTPAID",
    "effectiveDate": "ISO 8601 date"
  }
  ```
- **Response**:
  ```json
  {
    "id": "string",
    "paymentMode": "PREPAID | POSTPAID",
    "effectiveDate": "ISO 8601 date",
    "status": "ACTIVE | PENDING | FAILED"
  }
  ```

### Validating Transitions
- **Endpoint**: `POST /admin/subscriptions/{id}/validate-transition`
- **Request Body**:
  ```json
  {
    "currentPaymentMode": "PREPAID | POSTPAID",
    "newPaymentMode": "PREPAID | POSTPAID",
    "effectiveDate": "ISO 8601 date"
  }
  ```
- **Response**:
  ```json
  {
    "id": "string",
    "isValid": "boolean",
    "errors": [
      {
        "field": "string",
        "message": "string"
      }
    ]
  }
  ```

### Maintaining Feature Parity
- **Endpoint**: `GET /admin/subscriptions/{id}/feature-parity`
- **Response**:
  ```json
  {
    "id": "string",
    "paymentMode": "PREPAID | POSTPAID",
    "features": [
      {
        "name": "string",
        "isAvailable": "boolean",
        "details": "string"
      }
    ]
  }
  ```

## Feature Alignment During Transitions

### Prepaid to Postpaid Transition
- **Handling Procedures**:
  - Validate that the customer has no outstanding payments.
  - Ensure that the transition does not disrupt ongoing services.
  - Update the billing cycle to reflect the new payment mode.
- **Validation Rules**:
  - Ensure that the customer's account is in good standing.
  - Confirm that the transition does not violate any contractual obligations.
  - Validate that the effective date is within the current billing cycle.

### Postpaid to Prepaid Transition
- **Handling Procedures**:
  - Calculate the prorated amount for the remaining days in the billing cycle.
  - Ensure that the customer's payment method is valid and up-to-date.
  - Update the billing cycle to reflect the new payment mode.
- **Validation Rules**:
  - Ensure that the prorated amount is calculated correctly.
  - Confirm that the customer's payment method is valid.
  - Validate that the effective date is within the current billing cycle.

## Edge Case Handling

### Concurrent Payment Mode Changes
- **Test Case**: Multiple admins attempt to change the payment mode for the same subscription simultaneously.
- **Expected Response**: HTTP 409 Conflict with a descriptive error message.
- **Edge Cases**:
  - Admins with different permission levels.
  - Concurrent changes to different fields of the same subscription.
  - One admin's changes are saved while another's are rejected.

### Invalid Payment Mode Transitions
- **Test Case**: Admin attempts to transition to an invalid payment mode.
- **Expected Response**: HTTP 400 Bad Request with detailed validation errors.
- **Edge Cases**:
  - Invalid payment mode value.
  - Missing required fields.
  - Invalid effective date.

### Permission Conflict Resolution
- **Test Case**: Admin attempts to change the payment mode without the necessary permissions.
- **Expected Response**: HTTP 403 Forbidden with a descriptive error message.
- **Edge Cases**:
  - Admin requests permission escalation.
  - Higher-level admin overrides the permission conflict.
  - Audit logs capture the permission conflict and resolution.

## Test Scenarios

### Scenario 1: Prepaid to Postpaid Transition
- **Test Case**: Admin transitions a subscription from prepaid to postpaid mode.
- **Expected Response**: HTTP 200 OK with the updated subscription details.
- **Edge Cases**:
  - Customer has outstanding payments.
  - Transition disrupts ongoing services.
  - Effective date is outside the current billing cycle.

### Scenario 2: Postpaid to Prepaid Transition
- **Test Case**: Admin transitions a subscription from postpaid to prepaid mode.
- **Expected Response**: HTTP 200 OK with the updated subscription details.
- **Edge Cases**:
  - Prorated amount is calculated incorrectly.
  - Customer's payment method is invalid.
  - Effective date is outside the current billing cycle.

### Scenario 3: Concurrent Payment Mode Changes
- **Test Case**: Multiple admins attempt to change the payment mode for the same subscription simultaneously.
- **Expected Response**: HTTP 409 Conflict with a descriptive error message.
- **Edge Cases**:
  - Admins with different permission levels.
  - Concurrent changes to different fields of the same subscription.
  - One admin's changes are saved while another's are rejected.

## Escalation Workflows

### Payment Mode Transition Approval
- **Endpoint**: `POST /admin/payment-modes/{id}/approve`
- **Request Body**:
  ```json
  {
    "adminId": "string",
    "reason": "string"
  }
  ```
- **Response**:
  ```json
  {
    "id": "string",
    "status": "APPROVED | REJECTED",
    "reason": "string"
  }
  ```

### Payment Mode Transition Rejection
- **Endpoint**: `POST /admin/payment-modes/{id}/reject`
- **Request Body**:
  ```json
  {
    "adminId": "string",
    "reason": "string"
  }
  ```
- **Response**:
  ```json
  {
    "id": "string",
    "status": "REJECTED",
    "reason": "string"
  }
  ```

## API Contracts

### Request/Response Payloads
- **Request Payloads**: Must adhere to the specified schema for each endpoint.
- **Response Payloads**: Must include all required fields and adhere to the specified schema.

### Error Handling
- **Error Responses**: Must include a descriptive error message and appropriate HTTP status code.

## Validation Rules

### Payment Mode Transitions
- **Payment Mode**: Must be one of `PREPAID` or `POSTPAID`.
- **Effective Date**: Must be a valid ISO 8601 date and within the current billing cycle.
- **Customer Status**: Must be in good standing with no outstanding payments.

### Admin Permissions
- **Permission Level**: Must have the necessary permissions to toggle payment modes.
- **Permission Escalation**: Must follow the approval workflow for permission escalation.

## System Behaviors

### Payment Mode Transitions
- **Transition Validation**: The system should validate all payment mode transitions before processing.
- **Feature Parity**: The system should maintain feature parity across payment modes.
- **Audit Logging**: The system should log all payment mode transitions for audit and security purposes.

### Error Handling
- **Error Responses**: The system should provide clear and descriptive error messages for failed transitions.
- **Retry Logic**: The system should implement retry logic for failed transitions.

## Next Steps
- Implement the system integration points and API specifications.
- Update the UX considerations for both customer-facing and admin interfaces.
- Ensure all stakeholders understand the payment modes and their transitions.