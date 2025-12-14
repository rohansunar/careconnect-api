import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiProperty({
    description: 'The name of the category',
    example: 'Updated Water Jars',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;
}
