# Product Listing System Design  
(Target: 300–600 RPS)

---

## 1. System Classification

### Type of System
This is a **read-heavy, geo-aware marketplace system**.

### Traffic Characteristics
- ~90% READ operations
- ~10% WRITE operations
- Reads are predictable and cache-friendly
- Writes are infrequent and non-latency-sensitive

### Core Read Operations
- Product listing near customer location
- Vendor availability checks
- Serviceability validation

This system is **not**:
- Real-time streaming
- Financial ledger
- Event-driven analytics engine

This system **is**:
- Geo-filtered catalog service
- Relational data with spatial constraints
- Strong candidate for caching and precomputation

---

## 2. Mental Model (High-Level)

- Customer address = dot on map
- Vendor address = dot on map
- Service area = circle
- Product listing = vendors inside circle + active products

The system avoids name-based logic entirely and relies on distance calculations.

---

## 3. High-Level Architecture

### Early-Scale, Production-Ready Setup

[ Load Balancer ]
|
[ API Servers (Node.js / NestJS) ]
|
[ PostgreSQL + PostGIS ]
|
[ Redis (Optional, Recommended) ]

### Architectural Style
- Modular Monolith
- Clean separation of domains (Address, Location, Vendor, Product)
- No premature microservices
- No distributed transactions

---

## 4. Product Listing Request Flow

1. Fetch customer default + active address
2. Validate address is serviceable (precomputed flag)
3. Identify nearby vendor addresses using geo-radius
4. Filter:
   - Active vendors
   - Active vendor addresses
   - Active products
5. Paginate and return response

---

## 5. Why Product Listing is the Bottleneck

Product listing involves:
- Geo-spatial filtering
- Multiple joins
- Pagination
- Sorting

This makes it the **most expensive read operation**, and therefore the correct benchmark for system capacity.

---

## 6. Minimum Infrastructure to Achieve 300–600 RPS

### 6.1 Application Layer

#### API Servers
- Instances: 2–3
- CPU: 2 vCPU each
- RAM: 4 GB each
- Runtime: Node.js 18+

**Reasoning**
- Node.js handles high concurrency efficiently
- API layer is mostly IO-bound
- CPU usage remains low

This layer is **not** the primary bottleneck.

---

### 6.2 Database Layer (Critical)

#### PostgreSQL Configuration
- PostgreSQL version: 14+
- PostGIS enabled
- CPU: 4 vCPU
- RAM: 16 GB
- Storage: NVMe SSD

#### Key PostgreSQL Settings
```conf
shared_buffers = 4GB
work_mem = 16MB
effective_cache_size = 12GB
max_connections = 200

Why

Geo indexes remain in memory
Join operations avoid disk spills
Index scans dominate execution plans

7. Indexing Strategy (Non-Negotiable)
Geo Indexes
CREATE INDEX ON locations USING GIST (geo_point);
CREATE INDEX ON vendor_addresses USING GIST (geo_point);

Filter Indexes
CREATE INDEX ON products (vendor_id, is_active);
CREATE INDEX ON vendors (id, is_active);
CREATE INDEX ON customer_addresses (customer_id, is_default, is_active);

Without these indexes:
System struggles at 50–100 RPS

With these indexes:
300–600 RPS is stable and sustainable

# Query Design Principles
Anti-Patterns (Avoid)

Calculating geo-distance on every request
Name-based location matching
Unbounded queries
N+1 vendor/product fetches

# Best Practices

Precompute isServiceable on address save
Use geo queries only for vendor discovery
Apply LIMIT and OFFSET or cursor pagination
Keep joins shallow and indexed

9. Expected RPS Benchmarks
Without Redis (Database Only)
Operation	Sustainable RPS
Address serviceability check	1,000+
Vendor geo lookup	600–800
Product listing	300–600

With Redis Caching
Cache key example: product:list:{locationId}:{page}

Operation	Sustainable RPS
Product listing	2,000–5,000
Serviceability checks	10,000+

10. What Breaks First

At ~800–1,000 RPS:

PostgreSQL CPU utilization exceeds 70–80%

Slow queries appear

Lock contention increases

Required Upgrades

Read replicas

Mandatory Redis caching

Query refactoring

Background recomputation jobs

11. Why 300–600 RPS is Safe

Geo queries are index-backed

Reads dominate writes

Serviceability is precomputed

No cross-region latency

No full table scans

Predictable query shapes

This is boring engineering, and boring systems scale.

12. Executive Summary

To achieve 300–600 RPS product listing, you need:

Modular monolith architecture

2–3 Node.js API servers

PostgreSQL + PostGIS (4 vCPU, 16 GB RAM)

GIST + composite indexes

Precomputed serviceability flags

Clean, bounded SQL queries

No Kubernetes.
No microservices.
No Elasticsearch.

Just correct fundamentals.

13. Final Mental Model (Kid Version)

Houses are dots

Service areas are circles

Database has a ruler

Indexes make the ruler fast

Cache remembers answers

That’s how scale happens.


---

If you want next (high-impact options):
- Redis key design + TTL strategy  
- EXPLAIN ANALYZE walkthrough  
- Load-test math (connections vs RPS)  
- When and how to introduce read replicas  
- System design interview answer version  

Just tell me the direction.