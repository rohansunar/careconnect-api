# Validation and Error Handling Rules

## Overview

This document outlines the validation and error handling rules for the `createSubscription` endpoint. The goal is to ensure that all inputs are validated and that appropriate error responses are provided for edge cases.

## Validation Rules

### 1. Customer Details

**Fields**:
- `user.id`: The authenticated customer's ID.

**Validation**:
- Ensure the user is authenticated and has a valid ID.
- Ensure the user has a default and active customer address.

**Error Handling**:
- If the user is not authenticated, return a `401 Unauthorized` error.
- If the user does not have a default and active customer address, return a `404 Not Found` error with the message `Customer Address not found`.

### 2. Product Description

**Fields**:
- `dto.productId`: The ID of the product being subscribed to.

**Validation**:
- Ensure the product exists in the database.
- Ensure the product is active and available for subscription.

**Error Handling**:
- If the product does not exist, return a `404 Not Found` error with the message `Product not found`.
- If the product is not active, return a `400 Bad Request` error with the message `Product is not available for subscription`.

### 3. Pricing

**Fields**:
- `dto.quantity`: The quantity of the product.
- `product.price`: The price per unit of the product.

**Validation**:
- Ensure the quantity is a positive integer.
- Ensure the product price is a positive number.

**Error Handling**:
- If the quantity is not a positive integer, return a `400 Bad Request` error with the message `Quantity must be a positive integer`.
- If the product price is not a positive number, return a `400 Bad Request` error with the message `Product price must be a positive number`.

### 4. Subscription Start Date

**Fields**:
- `dto.start_date`: The start date of the subscription.

**Validation**:
- Ensure the start date is a valid date string.
- Ensure the start date is not in the past.

**Error Handling**:
- If the start date is not a valid date string, return a `400 Bad Request` error with the message `Invalid start date`.
- If the start date is in the past, return a `400 Bad Request` error with the message `Start date cannot be in the past`.

### 5. Subscription Frequency

**Fields**:
- `dto.frequency`: The frequency of the subscription.
- `dto.custom_days`: The custom days for delivery (if applicable).

**Validation**:
- Ensure the frequency is one of the supported values (`DAILY`, `ALTERNATIVE_DAYS`, `CUSTOM_DAYS`).
- If the frequency is `CUSTOM_DAYS`, ensure the `custom_days` array is provided and contains valid days.

**Error Handling**:
- If the frequency is not supported, return a `400 Bad Request` error with the message `Invalid frequency`.
- If the frequency is `CUSTOM_DAYS` and the `custom_days` array is not provided or is empty, return a `400 Bad Request` error with the message `Custom days are required for CUSTOM_DAYS frequency`.
- If the `custom_days` array contains invalid days, return a `400 Bad Request` error with the message `Invalid day: {day}`.

### 6. Duplicate Subscription

**Validation**:
- Ensure the customer does not already have a subscription for the same product at the same address.

**Error Handling**:
- If a duplicate subscription exists, return a `409 Conflict` error with the message `A subscription for this product already exists for this customer address`.

## Error Handling

### 1. Database Errors

**Error Handling**:
- If a database error occurs (e.g., failed to retrieve customer address, failed to retrieve product, failed to check for duplicate subscription, failed to create subscription), return a `500 Internal Server Error` with the message `Failed to {action}`.

### 2. Payment Mode Configuration Errors

**Error Handling**:
- If the payment mode configuration file is missing or invalid, return a `500 Internal Server Error` with the message `Failed to load payment mode configuration`.
- If the payment mode in the configuration file is invalid, log a warning and default to a valid mode (e.g., `UPFRONT`).

### 3. Price Calculation Errors

**Error Handling**:
- If an error occurs during price calculation, return a `500 Internal Server Error` with the message `Failed to calculate total price`.

### 4. Validation Errors

**Error Handling**:
- If any validation fails, return a `400 Bad Request` error with an appropriate message.

## Edge Cases

### 1. Mid-Month Start Date

**Handling**:
- Calculate the proration factor based on the remaining days in the month.
- Ensure the proration factor is correctly applied to the total price calculation.

### 2. Invalid Payment Mode

**Handling**:
- If the payment mode in the configuration file is invalid, log a warning and default to a valid mode (e.g., `UPFRONT`).

### 3. Invalid Custom Days

**Handling**:
- If the `custom_days` array contains duplicate days, return a `400 Bad Request` error with the message `Duplicate days are not allowed`.
- If the `custom_days` array contains days that are not valid (e.g., not in the `DayOfWeek` enum), return a `400 Bad Request` error with the message `Invalid day: {day}`.

### 4. Invalid Quantity or Price

**Handling**:
- If the quantity or price is not a positive number, return a `400 Bad Request` error with an appropriate message.

### 5. Invalid Start Date

**Handling**:
- If the start date is not a valid date string, return a `400 Bad Request` error with the message `Invalid start date`.
- If the start date is in the past, return a `400 Bad Request` error with the message `Start date cannot be in the past`.

## Next Steps

- Implement the validation rules and error handling as described.
- Ensure all validation and error handling is comprehensive and covers all edge cases.
- Write test cases to verify the validation and error handling logic.
- Update the documentation to reflect the validation and error handling rules.