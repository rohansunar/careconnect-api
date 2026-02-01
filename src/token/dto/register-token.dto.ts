import { IsString, IsEnum, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DeviceType {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
  WEB = 'WEB',
}

export class RegisterTokenDto {
  @ApiProperty({
    description: 'FCM or APNs device token',
    example: 'fcm_token_here...',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  deviceToken: string;

  @ApiProperty({
    description: 'Unique device identifier',
    example: 'device_abc123',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  deviceId: string;

  @ApiProperty({
    description: 'Device type',
    enum: DeviceType,
    example: DeviceType.ANDROID,
  })
  @IsEnum(DeviceType)
  deviceType: DeviceType;

  @ApiPropertyOptional({
    description: 'User-friendly device name',
    example: 'My Samsung Phone',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;
}
