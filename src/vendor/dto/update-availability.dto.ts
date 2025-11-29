import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
} from 'class-validator';

export class UpdateAvailabilityDto {
  @ApiProperty({
    description: 'Vendor Active Status',
    example: 'true/false',
  })
  @IsBoolean()
  @IsNotEmpty()
  is_active: boolean;

  @ApiProperty({
    description: 'Vendor Active Status',
    example: 'true/false',
  })
  @IsBoolean()
  @IsOptional()
  is_available_today?: boolean;
}
