import { IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchQueryDto {
  @ApiProperty({
    description: 'Page number for pagination',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page for pagination',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  limit?: number = 10;
}
