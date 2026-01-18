/**
 * Represents a distance measurement with value and unit.
 */
export interface IDistance {
  value: number;
  unit: 'm' | 'km';
}

/**
 * Represents a customer's geographical location.
 */
export interface ICustomerAddress {
  lat: number;
  lng: number;
}

/**
 * Result of a proximity search, with product including distance.
 */
export interface IProximitySearchResult {
  product: any; // Framework-agnostic, actual type from domain, now includes distance
}

/**
 * Abstraction for retrieving customer address.
 */
export interface ICustomerAddressRetriever {
  getCustomerAddress(customerId: string): Promise<ICustomerAddress | null>;
}

/**
 * Abstraction for calculating distance between two points.
 */
export interface IDistanceCalculator {
  calculateDistance(from: ICustomerAddress, to: ICustomerAddress): IDistance;
}

/**
 * Abstraction for product data access in proximity searches.
 */
export interface IProductRepository {
  findProductsWithinRadius(
    customerLocation: ICustomerAddress,
    radiusKm: number,
    page: number,
    limit: number,
  ): Promise<{ results: IProximitySearchResult[]; total: number }>;
}