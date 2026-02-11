import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class UpdateAvailabilityDto {

  @ApiProperty({
    description: 'Vendor Active Status',
    example: 'true/false',
  })
  @IsBoolean()
  @IsOptional()
  is_available_today?: boolean;
}
