# Refactored SearchProducts Architecture

## Overview
The refactored `searchProducts` function will focus solely on proximity-based product search, adhering to SOLID principles. The core logic is made framework-agnostic, with clear separation of concerns through interfaces and abstractions.

## Key Changes
- Removed standard product fetching logic.
- Retained only proximity search functionality.
- Modified distance calculation to return an object with `value` and `unit` ('m' for meters if <1000m, 'km' for kilometers otherwise).
- Introduced pagination for proximity search using `page` and `limit` from `SearchQueryDto`.
- Refactored for Single Responsibility, Open-Closed, Dependency Inversion, etc.

## New Interfaces and Classes

### Interfaces
- `IDistance`: Represents distance with value and unit.
  ```typescript
  interface IDistance {
    value: number;
    unit: 'm' | 'km';
  }
  ```

- `ICustomerAddress`: Represents customer's location.
  ```typescript
  interface ICustomerAddress {
    lat: number;
    lng: number;
  }
  ```

- `IProximitySearchResult`: Result of proximity search including product and distance.
  ```typescript
  interface IProximitySearchResult {
    product: any; // Framework-agnostic, actual type from domain
    distance: IDistance;
  }
  ```

- `ICustomerAddressRetriever`: Abstraction for retrieving customer address.
  ```typescript
  interface ICustomerAddressRetriever {
    getCustomerAddress(customerId: string): Promise<ICustomerAddress | null>;
  }
  ```

- `IDistanceCalculator`: Abstraction for calculating distance between two points.
  ```typescript
  interface IDistanceCalculator {
    calculateDistance(from: ICustomerAddress, to: ICustomerAddress): IDistance;
  }
  ```

- `IProductRepository`: Abstraction for product data access (framework-agnostic).
  ```typescript
  interface IProductRepository {
    findProductsWithinRadius(customerLocation: ICustomerAddress, radiusKm: number, page: number, limit: number): Promise<{ results: IProximitySearchResult[], total: number }>;
  }
  ```

### Classes
- `DistanceCalculator`: Implements `IDistanceCalculator`. Calculates Haversine distance and formats as IDistance.
  - Responsibility: Compute distance between coordinates.

- `CustomerAddressRetriever`: Implements `ICustomerAddressRetriever`. Retrieves customer's default active address.
  - Responsibility: Fetch customer location data.

- `ProductRepository`: Implements `IProductRepository`. Handles database queries for proximity search.
  - Responsibility: Execute proximity queries with pagination.

- `ProximitySearchService`: Core service for proximity search logic.
  - Dependencies: `ICustomerAddressRetriever`, `IProductRepository`.
  - Responsibility: Orchestrate proximity search, handle pagination.

- `SearchService`: Orchestrates the overall search. Now only handles proximity search.
  - Dependencies: `ProximitySearchService`.
  - Responsibility: Entry point, delegates to ProximitySearchService.

## Class Diagram (Mermaid)
```mermaid
classDiagram
    class IDistance {
        +value: number
        +unit: 'm' | 'km'
    }

    class ICustomerAddress {
        +lat: number
        +lng: number
    }

    class IProximitySearchResult {
        +product: any
        +distance: IDistance
    }

    class ICustomerAddressRetriever {
        +getCustomerAddress(customerId: string): Promise~ICustomerAddress | null~
    }

    class IDistanceCalculator {
        +calculateDistance(from: ICustomerAddress, to: ICustomerAddress): IDistance
    }

    class IProductRepository {
        +findProductsWithinRadius(customerLocation: ICustomerAddress, radiusKm: number, page: number, limit: number): Promise~{ results: IProximitySearchResult[], total: number }~
    }

    class DistanceCalculator {
        +calculateDistance(from: ICustomerAddress, to: ICustomerAddress): IDistance
    }

    class CustomerAddressRetriever {
        +getCustomerAddress(customerId: string): Promise~ICustomerAddress | null~
    }

    class ProductRepository {
        +findProductsWithinRadius(customerLocation: ICustomerAddress, radiusKm: number, page: number, limit: number): Promise~{ results: IProximitySearchResult[], total: number }~
    }

    class ProximitySearchService {
        -customerAddressRetriever: ICustomerAddressRetriever
        -productRepository: IProductRepository
        +searchProducts(query: SearchQueryDto, customerId: string): Promise~{ data: IProximitySearchResult[], pagination: any }~
    }

    class SearchService {
        -proximitySearchService: ProximitySearchService
        +searchProducts(query: SearchQueryDto, customer: { id: any }): Promise~any~
    }

    DistanceCalculator ..|> IDistanceCalculator
    CustomerAddressRetriever ..|> ICustomerAddressRetriever
    ProductRepository ..|> IProductRepository
    ProximitySearchService --> ICustomerAddressRetriever
    ProximitySearchService --> IProductRepository
    SearchService --> ProximitySearchService
```

## Pagination for Proximity Search
- Use `page` and `limit` from `SearchQueryDto`.
- In `IProductRepository.findProductsWithinRadius`, apply LIMIT and OFFSET to the query.
- Return total count for pagination metadata.
- Default radius: 5km (configurable).

## Testing and Maintainability
- Each class has a single responsibility, making unit testing straightforward.
- Interfaces allow for easy mocking in tests.
- Framework-agnostic core logic can be tested independently of NestJS/Prisma.
- Dependency injection enables swapping implementations (e.g., for different databases).

## Implementation Notes
- The raw SQL query needs modification to include pagination: Add `LIMIT ${limit} OFFSET ${offset}`.
- Distance calculation in SQL remains in km, but post-process to format as IDistance.
- If no customer address, return empty results or throw error (to be decided).