CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography column to locations
ALTER TABLE "Location"
ADD COLUMN "getpoint" geography(Point, 4326);

-- Add geography column to vendor_addresses
ALTER TABLE "VendorAddress"
ADD COLUMN "getpoint" geography(Point, 4326);

-- Add geography column to customer_addresses
ALTER TABLE "CustomerAddress"
ADD COLUMN "getpoint" geography(Point, 4326);

-- Indexes (mandatory for performance)

CREATE INDEX idx_locations_geo
ON "Location" USING GIST ("getpoint");

CREATE INDEX idx_vendor_addresses_geo
ON "VendorAddress" USING GIST ("getpoint");

CREATE INDEX idx_customer_addresses_geo
ON "CustomerAddress" USING GIST ("getpoint");