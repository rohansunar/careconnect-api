# App Token Storage and Management Plan (Simplified)

## 1. Executive Summary

This document outlines a simplified plan for implementing app token storage and management for push notifications across all user types (customer, rider, vendor).

## 2. Current System Analysis

### 2.1 Database Architecture

| Model | ID Field | Auth Field | Token Fields |
|-------|----------|------------|--------------|
| Customer | `id` (UUID) | `phone` (unique) | None |
| Vendor | `id` (UUID) | `phone` (unique) | None |
| Rider | `id` (UUID) | `phone` (unique) | None |

### 2.2 Authentication Mechanisms

JWT-based authentication with role separation (customer, vendor, admin) with 10-hour token expiration.

### 2.3 Gaps Identified

1. No device/app token storage for push notifications
2. No push notification service (only email/SMS/WhatsApp)

## 3. Database Schema Enhancement

### 3.1 New Model: DeviceToken

```prisma
model DeviceToken {
  id           String   @id @default(uuid())
  user_id      String
  user_type    String   // CUSTOMER, RIDER, VENDOR
  device_token String
  device_id    String
  device_type  String   // ANDROID, IOS, WEB
  is_active    Boolean  @default(true)
  last_used_at DateTime @default(now())
  created_at   DateTime @default(now())
  updated_at   DateTime @default(now())

  @@index([user_id, user_type])
  @@index([device_token])
  @@unique([user_id, device_id])
}
```

### 3.2 Migration Script

```sql
CREATE TABLE "DeviceToken" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "user_type" TEXT NOT NULL,
  "device_token" TEXT NOT NULL,
  "device_id" TEXT NOT NULL,
  "device_type" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_used_at" TIMESTAMP NOT NULL DEFAULT now(),
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

CREATE INDEX "idx_device_token_user" ON "DeviceToken"("user_id", "user_type");
CREATE INDEX "idx_device_token_device_token" ON "DeviceToken"("device_token");
CREATE UNIQUE INDEX "idx_device_token_unique" ON "DeviceToken"("user_id", "device_id");
```

## 4. API Endpoint Design

### 4.1 Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tokens/register` | Register device token |
| PUT | `/api/tokens/refresh` | Update token last_used_at |
| DELETE | `/api/tokens/revoke?deviceId=` | Revoke device token |

### 4.2 Register Token Request

```typescript
interface RegisterTokenDto {
  deviceToken: string;  // FCM/APNs token
  deviceId: string;     // Unique device identifier
  deviceType: 'ANDROID' | 'IOS' | 'WEB';
  deviceName?: string;  // Optional
}
```

### 4.3 Responses

**Success (201):**
```json
{
  "success": true,
  "message": "Token registered successfully",
  "data": { "id": "uuid", "deviceId": "device_abc" }
}
```

**Error (400/401/409):**
```json
{
  "statusCode": 400,
  "message": "Validation error",
  "error": "Bad Request"
}
```

## 5. Push Notification Service

### 5.1 Core Methods

```typescript
@Injectable()
export class PushNotificationService {
  async sendToUser(userId: string, userType: string, payload: NotificationPayload): Promise<number>;
  async sendToDevice(deviceToken: string, payload: NotificationPayload): Promise<boolean>;
  private async getActiveTokens(userId: string, userType: string): Promise<string[]>;
}
```

### 5.2 FCM Integration

- Use firebase-admin SDK
- Batch limit: 500 tokens per request
- Handle token invalidation

## 6. Simplified Implementation Plan

### Phase 1: Core Infrastructure (Days 1-2)

1. Create DeviceToken Prisma model
2. Write database migration
3. Create TokenController with register/revoke endpoints
4. Create TokenService with basic CRUD

### Phase 2: Push Notifications (Days 3-4)

1. Implement PushNotificationService
2. Integrate with FCM
3. Add sendToUser method
4. Create notification logging

### Phase 3: Testing (Day 5)

1. Unit tests for TokenService
2. Integration tests for endpoints
3. FCM delivery testing

## 7. Files to Create

```
src/token/
├── token.module.ts
├── token.controller.ts
├── token.service.ts
└── dto/register-token.dto.ts

src/notification/
├── services/push-notification.service.ts
└── interfaces/notification.interface.ts

prisma/models/device_token.prisma
```

## 8. Environment Variables

```env
FCM_SERVER_KEY=your_fcm_server_key
FCM_PROJECT_ID=your_fcm_project_id
```

## 9. Security

- All endpoints require JWT authentication
- Validate device token format (10-500 chars)
- Rate limiting: 10 requests/minute per user
- Duplicate prevention: (user_id, device_id) unique constraint

## 10. Testing Strategy

### Unit Tests
- TokenService: register, revoke, refresh
- PushNotificationService: sendToUser, token retrieval

### Integration Tests
- Token registration with auth
- Push notification delivery
- Error scenarios

### Acceptance Criteria
- Token registration works for all user types
- Push notifications sent to registered devices
- No duplicate tokens
- Rate limiting enforced

## 11. Future Enhancements (Post-MVP)

- Device listing endpoint
- Notification templates
- Delivery analytics
- Topic-based notifications
- Multi-language support
