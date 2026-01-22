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
  isServiceable:boolean;
}

/**
 * Result of a proximity search, representing a product with its distance from the customer's location.
 */
export interface IProximitySearchResult {
  id: string;
  name: string;
  categoryId: string;
  images: string[];
  description: string | null;
  created_at: Date;
  vendorId: string;
  price: number;
  deposit: number | null;
  updated_at: Date;
  distance: IDistance;
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
