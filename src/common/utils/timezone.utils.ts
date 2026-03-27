import { IANAZone } from 'luxon';

const DEFAULT_APP_TIMEZONE = 'Asia/Kolkata';

export function getAppTimezone(): string {
  const configuredTimezone =
    process.env.APP_TIMEZONE || process.env.TIMEZONE || DEFAULT_APP_TIMEZONE;

  return IANAZone.isValidZone(configuredTimezone)
    ? configuredTimezone
    : DEFAULT_APP_TIMEZONE;
}

export const getTimezone = getAppTimezone;
