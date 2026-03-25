/**
 * Utility functions for vendor operations.
 * These functions are framework-agnostic and can be reused across the application.
 */

import { DateTime } from 'luxon';

/**
 * Gets the timezone from environment variable, defaulting to Asia/Kolkata.
 * Uses the TIMEZONE env variable if available, otherwise falls back to 'Asia/Kolkata'.
 */
function getTimezone(): string {
  return process.env.TIMEZONE || 'Asia/Kolkata';
}

/**
 * Checks if a vendor is ready to accept orders based on their operating hours.
 * Compares current time in the configured timezone against vendor's opening and closing times.
 *
 * @param openingTime - Vendor's opening time in "HH:mm" format (e.g., "09:00")
 * @param closingTime - Vendor's closing time in "HH:mm" format (e.g., "20:00")
 * @returns true if current timezone time is within operating hours, false otherwise
 *
 * @example
 * isVendorReadyToAcceptOrders("09:00", "20:00") // Returns true if current timezone time is between 9 AM and 8 PM
 */
export function isVendorReadyToAcceptOrders(
  openingTime: string,
  closingTime: string,
): boolean {
  // Get current time in the configured timezone using luxon
  const timezone = getTimezone();
  const now = DateTime.now().setZone(timezone);

  const currentHours = now.hour;
  const currentMinutes = now.minute;
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;

  // Parse opening time
  const [openHours, openMinutes] = openingTime.split(':').map(Number);
  const openingTimeInMinutes = openHours * 60 + openMinutes;

  // Parse closing time
  const [closeHours, closeMinutes] = closingTime.split(':').map(Number);
  const closingTimeInMinutes = closeHours * 60 + closeMinutes;

  // Check if current time is within operating hours
  return (
    currentTimeInMinutes >= openingTimeInMinutes &&
    currentTimeInMinutes < closingTimeInMinutes
  );
}

/**
 * Parses a time string in "HH:mm" format and returns hours and minutes.
 *
 * @param timeString - Time in "HH:mm" format
 * @returns Object with hours and minutes
 *
 * @example
 * parseTimeString("09:30") // Returns { hours: 9, minutes: 30 }
 */
export function parseTimeString(timeString: string): {
  hours: number;
  minutes: number;
} {
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours, minutes };
}
