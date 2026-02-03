import { IsString, IsOptional, IsObject, IsNumber } from 'class-validator';

export class NotificationPayload {
  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  sound?: string;

  @IsOptional()
  @IsNumber()
  badge?: number;

  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}
