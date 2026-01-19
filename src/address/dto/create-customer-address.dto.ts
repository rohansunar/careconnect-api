import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAddressDto } from './create-address.dto';

export enum AddressLabel {
  Home = 'Home',
  Office = 'Office',
  Restaurant = 'Restaurant',
  Shop = 'Shop',
  Institution = 'Institution',
}

export class CreateCustomerAddressDto extends CreateAddressDto {
  @ApiPropertyOptional({
    enum: AddressLabel,
    description: 'Label for the address (e.g., Home, Office)',
  })
  @IsOptional()
  @IsEnum(AddressLabel)
  label?: AddressLabel;
}