-- Enable PostGIS for geolocation (search by radius, sort by distance)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography point column (WGS84)
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "location" geography(Point, 4326);

-- Spatial index for ST_DWithin and distance queries
CREATE INDEX IF NOT EXISTS "Listing_location_idx" ON "Listing" USING GIST ("location");

-- Populate from existing latitude/longitude
UPDATE "Listing"
SET "location" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;

-- Trigger to keep location in sync when latitude/longitude change
CREATE OR REPLACE FUNCTION sync_listing_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."latitude" IS NOT NULL AND NEW."longitude" IS NOT NULL THEN
    NEW."location" := ST_SetSRID(ST_MakePoint(NEW."longitude", NEW."latitude"), 4326)::geography;
  ELSE
    NEW."location" := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS listing_location_sync ON "Listing";
CREATE TRIGGER listing_location_sync
  BEFORE INSERT OR UPDATE OF "latitude", "longitude"
  ON "Listing"
  FOR EACH ROW
  EXECUTE FUNCTION sync_listing_location();
