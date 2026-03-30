import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { UpdateAddressDto } from './update-address.dto';

export enum AddressLabel {
  Home = 'Home',
  Office = 'Office',
  Clinic = 'Clinic',
  Hospital = 'Hospital',
}

export class UpdateUserAddressDto extends UpdateAddressDto {
  @ApiPropertyOptional({
    enum: AddressLabel,
    description: 'Label for the address (e.g., Home, Office)',
  })
  @IsOptional()
  @IsEnum(AddressLabel)
  label?: AddressLabel;
}
