# API Endpoints for Subscription Management

## Subscription Management

### Create Subscription
- **Endpoint**: `POST /subscriptions`
- **Description**: Create a new subscription for a user.
- **Request Body**:
  ```json
  {
    "productId": "string",
    "frequency": "DAILY | ALTERNATIVE_DAYS | CUSTOM_DAYS",
    "custom_days": ["MONDAY", "WEDNESDAY", "FRIDAY"],
    "start_date": "ISO 8601 date",
    "quantity": "number",
    "customerAddressId": "string"
  }
  ```
- **Response**:
  ```json
  {
    "id": "string",
    "productId": "string",
    "frequency": "DAILY | ALTERNATIVE_DAYS | CUSTOM_DAYS",
    "custom_days": ["MONDAY", "WEDNESDAY", "FRIDAY"],
    "start_date": "ISO 8601 date",
    "quantity": "number",
    "total_price": "number",
    "status": "ACTIVE | INACTIVE | PENDING",
    "next_delivery_date": "ISO 8601 date",
    "customerAddressId": "string"
  }
  ```

### Get Subscription Details
- **Endpoint**: `GET /subscriptions/{id}`
- **Description**: Retrieve details of a specific subscription.
- **Response**:
  ```json
  {
    "id": "string",
    "productId": "string",
    "frequency": "DAILY | ALTERNATIVE_DAYS | CUSTOM_DAYS",
    "custom_days": ["MONDAY", "WEDNESDAY", "FRIDAY"],
    "start_date": "ISO 8601 date",
    "quantity": "number",
    "total_price": "number",
    "status": "ACTIVE | INACTIVE | PENDING",
    "next_delivery_date": "ISO 8601 date",
    "customerAddressId": "string"
  }
  ```

### Update Subscription
- **Endpoint**: `PUT /subscriptions/{id}`
- **Description**: Update details of an existing subscription.
- **Request Body**:
  ```json
  {
    "frequency": "DAILY | ALTERNATIVE_DAYS | CUSTOM_DAYS",
    "custom_days": ["MONDAY", "WEDNESDAY", "FRIDAY"],
    "quantity": "number"
  }
  ```
- **Response**:
  ```json
  {
    "id": "string",
    "productId": "string",
    "frequency": "DAILY | ALTERNATIVE_DAYS | CUSTOM_DAYS",
    "custom_days": ["MONDAY", "WEDNESDAY", "FRIDAY"],
    "start_date": "ISO 8601 date",
    "quantity": "number",
    "total_price": "number",
    "status": "ACTIVE | INACTIVE | PENDING",
    "next_delivery_date": "ISO 8601 date",
    "customerAddressId": "string"
  }
  ```

### Cancel Subscription
- **Endpoint**: `DELETE /subscriptions/{id}`
- **Description**: Cancel an existing subscription.
- **Response**:
  ```json
  {
    "message": "Subscription cancelled successfully"
  }
  ```

## Delivery Tracking

### Get Delivery History
- **Endpoint**: `GET /subscriptions/{id}/deliveries`
- **Description**: Retrieve delivery history for a subscription.
- **Response**:
  ```json
  [
    {
      "id": "string",
      "subscriptionId": "string",
      "delivery_date": "ISO 8601 date",
      "status": "DELIVERED | MISSED | PENDING",
      "orderId": "string"
    }
  ]
  ```

### Confirm Delivery
- **Endpoint**: `POST /deliveries/{id}/confirm`
- **Description**: Confirm a delivery.
- **Response**:
  ```json
  {
    "id": "string",
    "subscriptionId": "string",
    "delivery_date": "ISO 8601 date",
    "status": "DELIVERED",
    "orderId": "string"
  }
  ```

### Report Missed Delivery
- **Endpoint**: `POST /deliveries/{id}/missed`
- **Description**: Report a missed delivery.
- **Response**:
  ```json
  {
    "id": "string",
    "subscriptionId": "string",
    "delivery_date": "ISO 8601 date",
    "status": "MISSED",
    "orderId": "string"
  }
  ```

## Payment Processing

### Process Payment
- **Endpoint**: `POST /subscriptions/{id}/payments`
- **Description**: Process a payment for a subscription.
- **Request Body**:
  ```json
  {
    "amount": "number",
    "payment_method": "string",
    "provider": "string"
  }
  ```
- **Response**:
  ```json
  {
    "id": "string",
    "subscriptionId": "string",
    "amount": "number",
    "status": "PAID | PENDING | FAILED",
    "provider_payment_id": "string",
    "provider": "string"
  }
  ```

### Get Payment History
- **Endpoint**: `GET /subscriptions/{id}/payments`
- **Description**: Retrieve payment history for a subscription.
- **Response**:
  ```json
  [
    {
      "id": "string",
      "subscriptionId": "string",
      "amount": "number",
      "status": "PAID | PENDING | FAILED",
      "provider_payment_id": "string",
      "provider": "string",
      "created_at": "ISO 8601 date"
    }
  ]
  ```

## End-of-Month Adjustments

### Process Adjustments
- **Endpoint**: `POST /subscriptions/{id}/adjustments`
- **Description**: Process end-of-month adjustments for a subscription.
- **Response**:
  ```json
  {
    "id": "string",
    "subscriptionId": "string",
    "expected_deliveries": "number",
    "actual_deliveries": "number",
    "adjustment_amount": "number",
    "reason": "string",
    "status": "PROCESSED | PENDING | FAILED"
  }
  ```

### Get Adjustment History
- **Endpoint**: `GET /subscriptions/{id}/adjustments`
- **Description**: Retrieve adjustment history for a subscription.
- **Response**:
  ```json
  [
    {
      "id": "string",
      "subscriptionId": "string",
      "expected_deliveries": "number",
      "actual_deliveries": "number",
      "adjustment_amount": "number",
      "reason": "string",
      "status": "PROCESSED | PENDING | FAILED",
      "created_at": "ISO 8601 date"
    }
  ]