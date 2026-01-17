import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsNumber,
} from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  cityId: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  pincode: string;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsNotEmpty()
  address: any;
}
