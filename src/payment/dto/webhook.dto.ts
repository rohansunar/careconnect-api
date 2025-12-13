import { IsObject, IsOptional } from 'class-validator';

/**
 * Data Transfer Object for payment webhook payload
 */
export class WebhookDto {
  /**
   * Webhook payload from payment provider
   */
  @IsObject()
  @IsOptional()
  payload?: any;
}