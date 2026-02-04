import { IsObject, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for payment webhook payload
 */
export class WebhookDto {
  @IsOptional()
  @ApiPropertyOptional({ description: 'Webhook entity from payment provider' })
  entity?: any;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Webhook account_id from payment provider',
  })
  account_id?: any;

  @IsOptional()
  @ApiPropertyOptional({ description: 'Webhook event from payment provider' })
  event?: any;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Webhook contains from payment provider',
  })
  contains?: any;
  /**
   * Webhook payload from payment provider
   */
  @IsObject()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Webhook payload from payment provider' })
  payload?: any;
}
