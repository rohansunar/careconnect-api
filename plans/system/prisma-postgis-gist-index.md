# Prisma + PostGIS: GIST Indexing Explained (Important)

---

## 1. The Core Confusion (You Are Right)

You are correct:

> ❌ There is NO `USING GIST (geo_point)` visible in the Prisma schema  
> ❌ Prisma does NOT automatically generate GIST indexes for PostGIS  
> ❌ `Unsupported("geography(Point,4326)")` hides geo capabilities from Prisma

This is **not a mistake on your part**.  
This is a **known limitation of Prisma**.

---

## 2. Key Truth (Memorize This)

### 🔑 Prisma Schema ≠ Full PostgreSQL Schema

- Prisma schema:
  - Defines models
  - Defines relations
  - Defines **logical indexes only**
- PostgreSQL:
  - Owns extensions (PostGIS)
  - Owns GIST / SP-GIST indexes
  - Owns spatial operators

👉 **Spatial indexes must be created using SQL migrations.**

---

## 3. What Prisma CAN Do

Prisma **can**:
- Store PostGIS geography fields
- Use them in raw SQL (`$queryRaw`)
- Maintain relations & non-geo indexes

Prisma **cannot**:
- Generate `USING GIST` indexes
- Understand spatial operators
- Manage PostGIS extensions internally

---

## 4. Correct Prisma Schema (Logical Level)

### 4.1 Location Model (Prisma)

```prisma
model Location {
  id              String   @id @default(uuid())
  name            String
  state           String
  country         String

  geoPoint        Unsupported("geography(Point,4326)")
  serviceRadiusKm Float
  isServiceable   Boolean  @default(true)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([isServiceable])
}
