import {
  IsString,
  IsOptional,
  IsInt,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';

export class UpdateAddressDto {
  @IsNotEmpty()
  @IsString()
  cityId: string;

  @IsNotEmpty()
  @IsString()
  state: string;

  @IsNotEmpty()
  @IsString()
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
