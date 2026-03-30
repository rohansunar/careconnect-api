/**
 * Represents a distance measurement with value and unit.
 */
export interface IDistance {
  value: number;
  unit: 'meters' | 'km';
}

/**
 * Represents a user's geographical location.
 */
export interface IUserAddress {
  lat: number;
  lng: number;
  isServiceable: boolean;
  serviceRadiusKm: string;
}

/**
 * Result of a proximity search, representing a product with its distance from the user's location.
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
  subscription_price: number | null;
  is_active: boolean;
  approval_status: string;
  approved_by: string | null;
  approved_at: Date | null;
  is_schedulable: boolean;
  updated_at: Date;
  distance: IDistance;
  percentageDecrease: number | null;
  vendorName?: string;
  openingTime: string;
  closingTime: string;
  isReadyToAcceptOrders: boolean;
}

/**
 * Abstraction for retrieving user address.
 */
export interface IUserAddressRetriever {
  getUserAddress(userId: string): Promise<IUserAddress | null>;
}

/**
 * Abstraction for product data access in proximity searches.
 */
export interface IProductRepository {
  findProductsWithinRadius(
    userLocation: IUserAddress,
    radiusKm: number,
    page: number,
    limit: number,
  ): Promise<{ results: IProximitySearchResult[]; total: number }>;
}
