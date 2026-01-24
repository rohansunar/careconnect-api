# Service Availability & Product Discovery System Design

## 1. Overview

This document defines the system design for determining:
- Service availability for Customer and Vendor addresses
- Product discovery based on geographic proximity
- Admin-controlled service coverage management

The system is designed to be scalable, location-agnostic, and resilient to map-based address inconsistencies.

---

## 2. Data Models

### 2.1 CustomerAddress
Represents an address saved by a customer.

**Fields**
- lat (Number)
- lng (Number)
- pincode (String)
- address (String)
- isDefault (Boolean)
- isActive (Boolean)
- isServiceable (Boolean)
- nearestLocationId (ObjectId, optional)

---

### 2.2 VendorAddress
Represents an address from which a vendor operates.

**Fields**
- lat (Number)
- lng (Number)
- pincode (String)
- address (String)
- isActive (Boolean)
- isServiceable (Boolean)
- nearestLocationId (ObjectId, optional)

---

### 2.3 Location (Service Coverage Master)
Defines regions where the application provides services.

**Fields**
- name (City name)
- state
- country
- lat (Service center latitude)
- lng (Service center longitude)
- serviceRadiusKm (Number)
- isServiceable (Boolean)

> Note: Location name is informational only. Geo-coordinates are the source of truth.

---

### 2.4 Product
Represents items uploaded by vendors.

**Fields**
- vendorId (ObjectId)
- isActive (Boolean)

---

## 3. Problem Statements

### 3.1 Service Availability Validation

When a Customer or Vendor saves an address:
- The system must determine whether the address is serviceable.
- City or locality names from map providers may not exactly match service location names.
- Service availability must be determined based on geographic distance, not string matching.

#### Example Scenario
- Service location: **Jalpaiguri, West Bengal**
- Address entered: **Kharia, West Bengal**
- Even if names differ, service should be available if Kharia lies within Jalpaiguri’s service radius.

If the address lies outside all configured service areas:
- Mark address as non-serviceable.

---

### 3.2 Vendor Delivery Rejection Scenario

If an address is serviceable at platform level but:
- Vendor does not deliver to that location

Then:
- Order is cancelled
- Refund reason:
  **"Rejected by Vendor – Delivery Not Available"**
- Any applicable charges are absorbed by **System/Admin**, not the customer.

---

### 3.3 Product Discovery Based on Customer Location

Products should be shown based on:
- Customer’s default and active address
- Product is active
- Vendor is active
- VendorAddress is active
- VendorAddress lies within serviceable radius of the customer

Displayed as:
> “Products available near your area”

---

### 3.4 Admin Service Area Management

Admins must be able to:
- Add new service locations
- Update service radius
- Enable or disable serviceability
- Trigger downstream recalculations or notifications

---

## 4. Core Design Principle

### **Never rely on city names. Always rely on coordinates.**

City, locality, and state names are unreliable due to:
- Map provider inconsistencies
- Suburban and rural overlaps
- Localization and spelling variations

Latitude, longitude, and radius are the only reliable indicators.

---

## 5. Service Availability Algorithm

### Distance-Based Matching (Primary Algorithm)

For a given address:

distance(address.lat, address.lng, location.lat, location.lng)
<= location.serviceRadiusKm



If **any** serviceable location satisfies this condition:
- Address is marked as serviceable

Otherwise:
- Address is non-serviceable

---

## 6. Address Save Flow (Customer / Vendor)

1. Capture latitude and longitude from map
2. Query all `Location` records where:
   - isServiceable = true
   - Distance <= serviceRadiusKm
3. If match found:
   - isServiceable = true
   - nearestLocationId = matched location
4. Else:
   - isServiceable = false
5. Persist result with address

This avoids repeated distance calculations during reads.

---

## 7. Product Fetching Flow

1. Fetch Customer’s default and active address
2. Identify nearby vendors:
   - Vendor is active
   - VendorAddress is active
   - VendorAddress lies within delivery radius
3. Fetch products where:
   - Product is active
   - VendorId belongs to nearby vendors
4. Order Data Nearest VendorAddress Products First or Created_at First.

---

## 8. Performance & Scalability Practices

### 8.1 GeoSpatial Indexing (Mandatory)

Create `2dsphere` indexes on:
- Location coordinates
- VendorAddress coordinates
- CustomerAddress coordinates

This ensures:
- Fast radius queries
- Logarithmic query performance

---

### 8.2 Precomputation Strategy

Store derived fields:
- isServiceable
- nearestLocationId
- lastServiceCheckAt

Benefits:
- Faster reads
- Reduced geo-calculation overhead
- Efficient checkout and listing flows

---

### 8.3 Vendor Delivery Capability Layer (Recommended)

Optional abstraction:
- VendorServiceArea
  - vendorId
  - lat, lng
  - deliveryRadiusKm
  - blockedZones (optional)

Allows vendors to:
- Restrict delivery even within serviceable cities
- Manage operational constraints

---

## 9. Additional Real-World Scenarios

### Partial Deliverability
Some products may not be deliverable to certain zones.

**Solution**
- Product-level delivery constraints

---

### Peak Load Restrictions
Vendors may temporarily pause delivery to certain areas.

**Solution**
- deliveryPaused flag with expiry

---

### Admin Radius Updates
Service radius updates may affect existing addresses.

**Solution**
- Background job to recompute serviceability
- Event-based notifications

---

### Address Pin Drift
Minor pin movement during selection.

**Solution**
- Apply tolerance buffer (e.g., +0.5 km)

---

## 10. Event-Driven Future Enhancements

Recommended domain events:
- LocationUpdated
- AddressServiceabilityChanged

Consumers:
- Notification Service
- Vendor Ops Dashboard
- Analytics

---

## 11. Summary

- Coordinates are the source of truth
- Geo-radius matching replaces string-based matching
- Precompute serviceability for performance
- Separate platform serviceability from vendor deliverability
- Design for admin-driven change and future notifications

This architecture is scalable, resilient, and production-ready.


## 12. Admin Updating Location Details 
- update location details
- Search for Customer and Vendor who falls in new updating location details 
- Notification them services availability.