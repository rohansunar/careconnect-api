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

  @IsNotEmpty()
  @IsNumber()
  lng?: number;

  @IsNotEmpty()
  @IsNumber()
  lat?: number;

  @IsNotEmpty()
  address: any;
}
