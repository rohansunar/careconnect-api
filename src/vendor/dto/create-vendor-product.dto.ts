import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateVendorProductDto {
  @IsString()
  product_id: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsNumber()
  deposit?: number;
}
