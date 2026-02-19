import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

/**
 * DTO for updating rider profile fields that riders are allowed to change.
 */
export class UpdateRiderProfileDto {
  @ApiPropertyOptional({
    description: 'Updated email address',
    example: 'rider@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Updated address text',
    example: '221B Baker Street, London',
  })
  @IsOptional()
  @IsString()
  address?: string;
}
