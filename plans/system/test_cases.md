1️⃣ What exactly are we testing?
Business rule (single source of truth)

A vendor belongs to a Location iff
distance(vendor, location.center) ≤ location.serviceRadiusKm

✅ Unit test cases (logic-level, fast)

- These do NOT hit the DB.
- They protect you from:
- unit mismatch (meters vs km)
- rounding bugs
- regression when refactoring

✅ Unit test cases (PASS)
| Case           | distance_meters | serviceRadiusKm | Expected |
| -------------- | --------------- | --------------- | -------- |
| Exact boundary | 10000           | 10              | true     |
| Inside radius  | 2500            | 10              | true     |
| Very close     | 25.10           | 10              | true     |
| Zero distance  | 0               | 10              | true     |


❌ Unit test cases (FAIL)
| Case            | distance_meters | serviceRadiusKm | Expected |
| --------------- | --------------- | --------------- | -------- |
| Just outside    | 10000.01        | 10              | false    |
| Far away        | 25000           | 10              | false    |
| Negative radius | 100             | -1              | false    |
| NaN distance    | NaN             | 10              | false    |

Cursor prompt (UNIT tests)
Prompt to Cursor

Write Jest unit tests for a function `isWithinServiceRadius(distanceMeters, serviceRadiusKm)`
The function should return true only if distanceMeters <= serviceRadiusKm * 1000.
Include edge cases: exact boundary, just outside boundary, zero distance, NaN values.
Ensure both passing and failing cases.

3️⃣ Integration test cases (PostGIS + Prisma)

These hit a real Postgres + PostGIS DB (Docker or test DB).

They validate:
- ST_DWithin correctness
- index usage
- unit correctness
- SQL mistakes

🌍 Test data setup (canonical)
Location:
  name: "CityCenter"
  lat: 19.076000
  lng: 72.877700
  serviceRadiusKm: 10
  isServiceable: true

Vendors

| Vendor | Distance from center | Lat/Lng offset | Expected |
| ------ | -------------------- | -------------- | -------- |
| V1     | 0.5 km               | tiny           | INCLUDED |
| V2     | 9.99 km              | near boundary  | INCLUDED |
| V3     | 10.00 km             | exact          | INCLUDED |
| V4     | 10.01 km             | just outside   | EXCLUDED |
| V5     | 25 km                | far            | EXCLUDED |

✅ Integration PASS cases

1. Vendor at 0–10 km returns the location
2. Vendor exactly at serviceRadiusKm
3. Location isServiceable = true
4. Multiple locations → nearest one returned

❌ Integration FAIL cases

1. Vendor outside radius
2. Location isServiceable = false
3. Location with NULL geopoint
4. Vendor coordinates swapped (lat/lng reversed)
5. serviceRadiusKm = 0

🧠 Cursor prompt (INTEGRATION tests)
Prompt to Cursor
Write NestJS integration tests using Jest for reverse geo-containment search.
Use PostgreSQL with PostGIS enabled.
Seed a Location with serviceRadiusKm = 10 and geopoint (19.076, 72.8777).
Seed multiple vendor coordinates at 0.5km, 9.99km, 10km, and 10.01km away.
Test that only vendors within ST_DWithin radius are returned.
Include failing cases for non-serviceable locations.
Clean up database after each test.


SQL-level validation tests (critical but often skipped)
These catch raw SQL bugs.
SELECT ST_DWithin(
  location.geopoint,
  vendor.geopoint,
  location.serviceRadiusKm * 1000
);

FAIL (should never be used)
WHERE ST_Distance(...) <= serviceRadiusKm
-- ❌ wrong unit

Cursor prompt (SQL regression tests)
Write database-level integration tests to validate ST_DWithin usage.
Ensure ST_DWithin uses meters and serviceRadiusKm is multiplied by 1000.
Fail the test if ST_Distance is compared directly with serviceRadiusKm.

Decimal precision test cases (you asked this earlier – now we lock it)
Precision tests

| Stored lat   | Stored lng   | Expected              |
| ------------ | ------------ | --------------------- |
| 19.076       | 72.8777      | FAIL (too coarse)     |
| 19.076000    | 72.877700    | PASS                  |
| 19.076000123 | 72.877700456 | Rounded to 6 decimals |

Cursor prompt
Write tests ensuring latitude and longitude are normalized to 6 decimal places before insert.
Reject or round values with more than 6 decimal places.

One golden rule (print this)

If geo tests are weak, refunds and SLA will explode.
Your test suite should answer:
“Is this vendor allowed here?”
“Why was this order rejected?”
“Can I prove this decision?”
If tests answer those, you’re production-safe.

Want next?

I can give you:
Docker test DB setup
Seed scripts
CI pipeline for PostGIS
Property-based geo tests
Load-test scenarios (300–600 RPS)