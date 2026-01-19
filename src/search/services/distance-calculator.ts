import {
  IDistance,
  ICustomerAddress,
  IDistanceCalculator,
} from '../interfaces/search.interfaces';

/**
 * Calculates distance between two geographical points using Haversine formula.
 * Returns distance in meters if less than 1000m, otherwise in kilometers.
 */
export class DistanceCalculator implements IDistanceCalculator {
  /**
   * Calculates the distance between two points on Earth.
   * @param from Starting point
   * @param to Ending point
   * @returns Distance with value and unit
   */
  calculateDistance(from: ICustomerAddress, to: ICustomerAddress): IDistance {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(to.lat - from.lat);
    const dLng = this.toRadians(to.lng - from.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(from.lat)) *
        Math.cos(this.toRadians(to.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    if (distanceKm < 1) {
      // Less than 1 km, return in meters
      return {
        value: Math.round(distanceKm * 1000),
        unit: 'm',
      };
    } else {
      // 1 km or more, return in kilometers
      return {
        value: Math.round(distanceKm * 100) / 100, // Round to 2 decimal places
        unit: 'km',
      };
    }
  }

  /**
   * Converts degrees to radians.
   * @param degrees Angle in degrees
   * @returns Angle in radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
