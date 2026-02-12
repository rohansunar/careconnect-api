# Order Cancellation Endpoint Documentation

## Overview

This document provides comprehensive documentation for the vendor-initiated order cancellation feature implemented in the Water Delivery System API. The cancellation endpoint allows vendors to cancel orders that have not yet been delivered, with automatic refund processing for online payments and multi-channel notifications.

---

## API Endpoint

### Cancel Order

**Endpoint**: `POST /vendor/orders/:id/cancel`

**Authentication Required**: Yes (Vendor role)

**Content-Type**: `application/json`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Unique identifier of the order to cancel |

### Request Body

```json
{
  "cancelReason": "string"
}
```

#### Fields

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `cancelReason` | String | Yes | 1-500 characters | Reason for cancelling the order |

### Example Request

```bash
curl -X POST "http://localhost:3000/vendor/orders/550e8400-e29b-41d4-a716-446655440000/cancel" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <vendor_jwt_token>" \
  -d '{"cancelReason": "Customer requested cancellation due to change of plans"}'
```

---

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "orderNo": "O000001",
  "deliveryStatus": "CANCELLED",
  "cancelledAt": "2026-02-12T12:00:00.000Z",
  "cancelReason": "Vendor-Cancellation: Customer requested cancellation due to change of plans",
  "refundAmount": 500.00,
  "message": "Order cancelled successfully. Refund of ₹500.00 will be processed."
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Indicates successful cancellation |
| `orderId` | UUID | The cancelled order's unique identifier |
| `orderNo` | String | Human-readable order number |
| `deliveryStatus` | String | Always "CANCELLED" for successful cancellation |
| `cancelledAt` | DateTime | ISO 8601 timestamp when order was cancelled |
| `cancelReason` | String | The cancellation reason with "Vendor-Cancellation:" prefix |
| `refundAmount` | Number (optional) | Refund amount for online payments |
| `message` | String | Human-readable status message |

### Error Responses

#### Bad Request (400)

Returned when input validation fails.

```json
{
  "statusCode": 400,
  "message": "Invalid order ID format. Expected UUID format (e.g., 550e8400-e29b-41d4-a716-446655440000)",
  "error": "Bad Request",
  "timestamp": "2026-02-12T12:00:00.000Z",
  "path": "/vendor/orders/invalid-id/cancel"
}
```

**Common messages:**
- "Order ID is required"
- "Invalid order ID format. Expected UUID format..."
- "Cancellation reason is required"
- "Cancellation reason must not exceed 500 characters"

#### Forbidden (403)

Returned when the vendor doesn't own the order.

```json
{
  "statusCode": 403,
  "message": "You do not have permission to cancel this order",
  "error": "Forbidden",
  "timestamp": "2026-02-12T12:00:00.000Z",
  "path": "/vendor/orders/550e8400-e29b-41d4-a716-446655440000/cancel"
}
```

#### Not Found (404)

Returned when the order doesn't exist.

```json
{
  "statusCode": 404,
  "message": "Order with ID 550e8400-e29b-41d4-a716-446655440000 not found",
  "error": "Not Found",
  "timestamp": "2026-02-12T12:00:00.000Z",
  "path": "/vendor/orders/550e8400-e29b-41d4-a716-446655440000/cancel"
}
```

#### Conflict (409)

Returned when the order cannot be cancelled due to its current state.

```json
{
  "statusCode": 409,
  "message": "Cannot cancel an order that has already been delivered",
  "error": "Conflict",
  "timestamp": "2026-02-12T12:00:00.000Z",
  "path": "/vendor/orders/550e8400-e29b-41d4-a716-446655440000/cancel"
}
```

**Common messages:**
- "Cannot cancel an order that has already been delivered"
- "Order has already been cancelled"

#### Internal Server Error (500)

Returned when a database operation fails.

```json
{
  "statusCode": 500,
  "message": "Failed to process order cancellation. Please try again.",
  "error": "Internal Server Error",
  "timestamp": "2026-02-12T12:00:00.000Z",
  "path": "/vendor/orders/550e8400-e29b-41d4-a716-446655440000/cancel"
}
```

---

## Business Logic

### Cancellation Rules

1. **Order Ownership**: Only the vendor who owns the order can cancel it
2. **Delivery Status**: Orders with `delivery_status` = "DELIVERED" cannot be cancelled
3. **Already Cancelled**: Orders already marked as "CANCELLED" cannot be cancelled again

### Order Updates

When an order is successfully cancelled:

| Field | Value | Description |
|-------|-------|-------------|
| `delivery_status` | "CANCELLED" | Order status updated |
| `cancelledAt` | Current timestamp | Cancellation time recorded |
| `cancelReason` | "Vendor-Cancellation: {reason}" | Reason with prefix |

### Payment Handling

#### Online Payments

For orders with `payment_mode` = "ONLINE":

1. **Refund Ledger Entry**: Creates a negative amount entry for the full order amount
2. **Fee Reversal Entries**: Creates positive amount entries to reverse platform fees

Example ledger entries:
```json
[
  {
    "type": "REFUND",
    "feeType": "ADJUSTMENT",
    "amount": -500.00,
    "vendorId": "vendor-uuid"
  },
  {
    "type": "PLATFORM_FEE",
    "feeType": "LISTING_FEE",
    "amount": 50.00,
    "vendorId": "vendor-uuid"
  }
]
```

#### Cash on Delivery (COD) / Other Modes

No refund processing is required. Only order status is updated.

---

## Notifications

The cancellation triggers notifications through multiple channels:

### Customer Notifications

| Channel | Content |
|---------|---------|
| Email | Order cancellation confirmation with refund details (if applicable) |
| Push | "Your order #O000001 has been cancelled. Refund of ₹500.00 will be processed." |

### Vendor Notifications

| Channel | Content |
|---------|---------|
| Email | Order cancellation confirmation |
| Push | "Order #O000001 was cancelled" |

### Admin Notifications

| Channel | Content |
|---------|---------|
| Email | Order cancellation summary for audit purposes |

---

## Error Handling

### Input Validation

All inputs are validated with descriptive error messages:

- **Order ID**: Must be a valid UUID format
- **Cancel Reason**: Required, 1-500 characters

### Error Response Format

All error responses follow this consistent format:

```typescript
interface ErrorResponse {
  statusCode: number;  // HTTP status code
  message: string;     // User-friendly error message
  error: string;       // HTTP error name
  timestamp: string;   // ISO 8601 timestamp
  path: string;        // Request path
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 400 | Bad Request | Invalid input format or missing required fields |
| 403 | Forbidden | Vendor doesn't own the order |
| 404 | Not Found | Order doesn't exist |
| 409 | Conflict | Order already delivered or cancelled |
| 500 | Internal Server Error | Database or service failure |

---

## Debugging the Cancellation Workflow

### Log Points

The service logs at key points in the workflow:

1. **Cancellation Initiated**: `Order cancellation initiated for order {orderId} by vendor {vendorId}`
2. **Cancellation Rejected**: `Cancellation rejected - order already delivered: {orderId}`
3. **Cancellation Success**: `Order {orderId} ({orderNo}) cancelled by vendor {vendorId}. Reason: {reason}`
4. **Refund Created**: `Created refund ledger entry for order {orderId}: ₹{amount} (refund)`
5. **Fee Reversal Created**: `Created fee reversal entry for order {orderId}, item {orderItemId}: ₹{amount}`
6. **Notification Failure**: `Failed to send cancellation notifications for order {orderId}: {error}`

### Log Correlation

Each notification operation includes a correlation ID for tracing:

```typescript
const correlationId = `order-cancel-${orderId}-${Date.now()}`;
```

Use this ID to trace logs across services.

### Debugging Steps

1. **Check Order State**: Verify the order's `delivery_status` is not "DELIVERED"
2. **Verify Ownership**: Confirm `vendorId` matches the authenticated vendor
3. **Check Logs**: Look for the correlation ID in application logs
4. **Verify Notifications**: Check notification service logs for delivery status
5. **Check Ledger**: Verify ledger entries were created for refunds

---

## Testing

### Unit Test Scenarios

| Scenario | Expected Result |
|----------|-----------------|
| Cancel with valid order and reason | Order cancelled, success response |
| Cancel with invalid UUID format | 400 Bad Request |
| Cancel with missing reason | 400 Bad Request |
| Cancel order not owned by vendor | 403 Forbidden |
| Cancel non-existent order | 404 Not Found |
| Cancel already delivered order | 409 Conflict |
| Cancel already cancelled order | 409 Conflict |
| Cancel COD order | Order cancelled, no refund |
| Cancel ONLINE order | Order cancelled, refund processed |

### Integration Testing

Use the following cURL command to test:

```bash
# Test successful cancellation
curl -X POST "http://localhost:3000/vendor/orders/550e8400-e29b-41d4-a716-446655440000/cancel" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <vendor_jwt_token>" \
  -d '{"cancelReason": "Customer requested cancellation"}'
```

---

## Extension Points

### Future Capabilities

The implementation is designed to support future enhancements:

#### 1. Partial Cancellation

Add `orderItemIds` field to CancelOrderDto:

```typescript
interface CancelOrderDto {
  cancelReason: string;
  orderItemIds?: string[]; // NEW: Specific items to cancel
}
```

#### 2. Automated Cancellation Rules

Implement a rules engine:

```typescript
interface CancellationRule {
  maxHoursSinceOrder: number;      // Max hours before auto-cancel
  requireVendorConfirmation: boolean;
  notifyCustomerBeforeCancel: boolean;
}
```

#### 3. Cancellation Window

Add time-based restrictions:

```typescript
const CANCELLATION_WINDOW_HOURS = 24;
if (order.created_at < windowStart) {
  throw new BadRequestException('Cancellation window has expired');
}
```

#### 4. Refund Policy Integration

Add custom refund calculation:

```typescript
interface RefundPolicy {
  fullRefundHours: number;       // Hours for full refund
  partialRefundPercent: number;  // Refund percentage after window
}

const refundPolicy = await getRefundPolicy(order.vendorId);
```

#### 5. Cancellation Appeals

Allow customers to appeal cancellations:

```typescript
interface CancellationAppeal {
  orderId: string;
  reason: string;
  customerId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}
```

### Code Extensibility

The service methods use interfaces that can be extended:

```typescript
// Current interface
interface CancelOrderResult {
  success: boolean;
  orderId: string;
  // ...
}

// Extended interface for partial cancellations
interface ExtendedCancelOrderResult extends CancelOrderResult {
  cancelledItems: string[];
  remainingItems: string[];
  partialRefundAmount: number;
}
```

---

## Implementation Details

### Files Modified

| File | Change |
|------|--------|
| `src/order/controllers/vendor-order.controller.ts` | Added cancelOrder endpoint |
| `src/order/services/vendor-order.service.ts` | Implemented cancelOrder and refund logic |
| `src/notification/services/orchestrators/order-notification.orchestrator.ts` | Added admin + customer push |
| `src/email-templates/templates/orders/admin-order-cancellation.tsx` | New admin email template |
| `src/email-templates/templates/orders/index.ts` | Export new template |

### Architectural Decisions

1. **Single Responsibility**: Each method handles one specific task
2. **Atomic Transactions**: Database operations use Prisma transactions
3. **Async Notifications**: Notifications are sent after order update completes
4. **Loose Coupling**: Service depends on notification orchestrator interface
5. **Structured Logging**: Correlation IDs for request tracing

### Performance Considerations

- Notifications are sent asynchronously to not block the cancellation response
- Ledger entries are created within the same transaction as order update
- Fee reversals are processed in batch for multiple order items

---

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Vendor can only cancel their own orders
3. **Input Sanitization**: Cancellation reason is trimmed and length-limited
4. **Error Messages**: Internal details are not exposed in error responses
5. **Audit Trail**: All cancellation actions are logged for compliance
