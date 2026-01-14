export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

export enum SubscriptionFrequency {
  DAILY = 'DAILY',
  ALTERNATIVE_DAYS = 'ALTERNATIVE_DAYS',
  CUSTOM_DAYS = 'CUSTOM_DAYS',
}

export interface DeliveryFrequencyService {
  validateFrequency(frequency: SubscriptionFrequency, customDays?: DayOfWeek[]): void;
  validateCustomDays(customDays: DayOfWeek[]): void;
  getNextDeliveryDate(startDate: Date, frequency: SubscriptionFrequency, customDays?: DayOfWeek[]): Date;
  getDeliveryDays(frequency: SubscriptionFrequency, customDays?: DayOfWeek[]): DayOfWeek[];
}