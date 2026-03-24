import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data payload for additional notification data (key-value pairs)
 */
export class NotificationData {
  @ApiPropertyOptional({
    description: 'Additional data key-value pairs',
    example: { orderId: '123', type: 'order_update' },
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}

/**
 * DTO for sending push notification to the logged-in user's device(s)
 *
 * This endpoint allows authenticated users (customers, vendors, riders)
 * to send push notifications to their own registered devices.
 */
export class SendNotificationDto {
  @ApiProperty({
    description: 'Notification title',
    example: 'Order Update',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @ApiProperty({
    description: 'Notification body/message',
    example: 'Your order has been confirmed',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: 'Body is required' })
  @MinLength(1)
  @MaxLength(500)
  body: string;

  @ApiPropertyOptional({
    description: 'Optional data payload for the notification',
    example: { orderId: '123', type: 'order_update' },
  })
  @IsOptional()
  @IsObject({ message: 'Data must be a valid object' })
  data?: Record<string, string>;
}
