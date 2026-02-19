## Rider API Additions (Feb 19, 2026)

### PUT /riders/me
- Purpose: Rider updates their own `email` and/or `address`.
- Request body:
```json
{
  "email": "rider@example.com",
  "address": "221B Baker Street, London"
}
```
- Response: updated rider profile fields
```json
{
  "id": "uuid",
  "name": "Jane Doe",
  "phone": "+919832012345",
  "email": "rider@example.com",
  "address": "221B Baker Street, London"
}
```
- Validation: at least one of `email` or `address` required; email must be valid; returns 400 on duplicates or missing fields.

### POST /rider/orders/:id/verify-delivery-otp
- Purpose: Rider confirms delivery using 4‑digit OTP for an assigned order.
- Request body:
```json
{ "otp": "1234" }
```
- Success response: `{ "success": true }`
- Failure cases: 400 for bad OTP/state/expired, 403 when order not assigned, 404 when order missing.
- Side effects: sets `delivery_status` to `DELIVERED`, clears `delivery_otp`, marks `otp_verified`; COD orders also set `payment_status` to `PAID` and stamp payment completion.

### POST /rider/orders/:id/cancel
- Purpose: Rider cancels an assigned order with a reason.
- Request body:
```json
{ "cancelReason": "Customer unreachable after multiple attempts" }
```
- Success response: `{ "success": true }`
- Failure cases: 400 invalid ID/reason, 403 not assigned, 404 missing order, 409 if already delivered/cancelled.
- Side effects: sets `delivery_status` to `CANCELLED`, `cancellation_origin` to `RIDER`, stores reason and timestamp.

### Debug / Extensibility Notes
- Errors use Nest exceptions for consistent HTTP codes and messages; upstream filters keep responses user-friendly.
- OTP flow and cancellation run inside Prisma transactions for atomic updates.
- OTP validity: 24 hours after generation; adjust `OTP_EXPIRATION_MS` in `src/order/services/rider-order.service.ts` if business rules change.
- Payment auto-marking is limited to COD; extend inside `verifyDeliveryOtpForRider` for other payment modes if needed.
