# Geo-Based Service Availability System  
(PostgreSQL Design + Kid-Friendly Story Explanation)

---

# PART 1: POSTGRESQL SCHEMAS & INDEXES (PRODUCTION-GRADE)

## 1. Core Principle

- **City names are not reliable**
- **Latitude + Longitude + Radius is the source of truth**
- PostgreSQL uses **PostGIS** for fast geo-queries

---

## 2. Required Extensions

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

# Geo-Based Service Availability System  
(PostgreSQL Design + Kid-Friendly Story Explanation)

---

# PART 1: POSTGRESQL SCHEMAS & INDEXES (PRODUCTION-GRADE)

## 1. Core Principle

- **City names are not reliable**
- **Latitude + Longitude + Radius is the source of truth**
- PostgreSQL uses **PostGIS** for fast geo-queries

---

## 2. Required Extensions

```sql
CREATE EXTENSION IF NOT EXISTS postgis;


CREATE INDEX idx_locations_geo 
ON locations 
USING GIST (geo_point);

CREATE INDEX idx_locations_serviceable 
ON locations (is_serviceable);


CREATE TABLE customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,

    address TEXT NOT NULL,
    pincode TEXT,

    geo_point GEOGRAPHY(Point, 4326) NOT NULL,

    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_serviceable BOOLEAN DEFAULT FALSE,

    nearest_location_id UUID REFERENCES locations(id),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


CREATE INDEX idx_customer_addresses_geo
ON customer_addresses
USING GIST (geo_point);

CREATE INDEX idx_customer_default_active
ON customer_addresses (customer_id, is_default, is_active);


CREATE TABLE vendor_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL,

    address TEXT NOT NULL,
    pincode TEXT,

    geo_point GEOGRAPHY(Point, 4326) NOT NULL,

    is_active BOOLEAN DEFAULT TRUE,
    is_serviceable BOOLEAN DEFAULT FALSE,

    nearest_location_id UUID REFERENCES locations(id),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vendor_addresses_geo
ON vendor_addresses
USING GIST (geo_point);

CREATE INDEX idx_vendor_active
ON vendor_addresses (vendor_id, is_active);


CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id),

    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT NOW()
);


CREATE INDEX idx_products_vendor_active
ON products (vendor_id, is_active);

## Serviceability Check Query (CORE LOGIC)

SELECT l.id
FROM locations l
WHERE l.is_serviceable = TRUE
AND ST_DWithin(
    l.geo_point,
    ST_MakePoint(:lng, :lat)::geography,
    l.service_radius_km * 1000
)
LIMIT 1;


## Product Fetch Query (Simplified)
SELECT p.*
FROM products p
JOIN vendors v ON v.id = p.vendor_id
JOIN vendor_addresses va ON va.vendor_id = v.id
WHERE
    p.is_active = TRUE
    AND v.is_active = TRUE
    AND va.is_active = TRUE
    AND ST_DWithin(
        va.geo_point,
        :customer_geo_point,
        :max_delivery_radius_meters
    );

Characters in the Story
🏠 Customer House

A kid lives in a house.
The house is shown as a dot on the map.

🏪 Vendor Shop

A shop sells toys.
The shop is also a dot on the map.

🟢 Service City Circle

The king (Admin) draws big circles on the map.
Inside the circle → delivery is allowed
Outside the circle → delivery is not allowed

Why City Names Don’t Matter

The kid says:

“My house name is Kharia!”

The map says:

“This circle is called Jalpaiguri!”

The app thinks:

“Names are confusing 😵
I will only check distance, not names.”

So the app takes a ruler 📏 and measures:

From house dot

To circle center

If the house is inside the circle → ✅ Service Available
If the house is outside the circle → ❌ Service Not Available


### What we can do next (high-value options)
- Convert this into **System Design interview answer**
- Add **Redis caching strategy**
- Add **background jobs & events**
- Turn this into **clean repository folder structure**
- Explain **why PostGIS beats Mongo Geo in scale**

Just tell me the next move.

Enable PostGIS (Once per DB)
## Where to Create CREATE EXTENSION postgis
You must create it via:

- SQL migration
```
npx prisma migrate dev --create-only --name enable-postgis

Edit generated SQL file and add only below Query:
CREATE EXTENSION IF NOT EXISTS postgis;

Run
npx prisma migrate dev

```
- OR database init script
If using Docker Postgres:
```
/docker-entrypoint-initdb.d/001-postgis.sql
CREATE EXTENSION IF NOT EXISTS postgis;

```

- OR once manually on DB
  CREATE EXTENSION postgis;


  Create GIST Indexes (Mandatory) - 
  npx prisma migrate dev --create-only --name add-postgis-gist-indexes

  Edit the generated SQL file and add only below Query:
    CREATE EXTENSION IF NOT EXISTS postgis;

    -- 2️⃣ Add geography column to locations
    ALTER TABLE locations
    ADD COLUMN geo_point geography(Point, 4326);

    -- 3️⃣ Add geography column to vendor_addresses
    ALTER TABLE vendor_addresses
    ADD COLUMN geo_point geography(Point, 4326);

    -- 4️⃣ Add geography column to customer_addresses
    ALTER TABLE customer_addresses
    ADD COLUMN geo_point geography(Point, 4326);

    CREATE INDEX idx_locations_geo
    ON "Location"
    USING GIST ("geoPoint");

    CREATE INDEX idx_vendor_addresses_geo
    ON "VendorAddress"
    USING GIST ("geoPoint");

    CREATE INDEX idx_customer_addresses_geo
    ON "CustomerAddress" 
    USING GIST (geoPoint);


    Why 6 decimals? (kid + engineer brain together)

    Earth is big 🌍
    Decimals after the dot decide how close two points can be.

    Decimal places	Precision
    1	~11 km
    2	~1.1 km
    3	~110 m
    4	~11 m
    5	~1.1 m
    6	~11 cm
    7	~1.1 cm
    8+	GPS noise, pointless