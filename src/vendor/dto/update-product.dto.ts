import { IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  deposit?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
