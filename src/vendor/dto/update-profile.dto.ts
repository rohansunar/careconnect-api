import { IsOptional, IsString, IsEmail, IsArray, IsEnum } from 'class-validator';

export enum DayOfWeek {
  MONDAY = "MONDAY",
  TUESDAY = "TUESDAY",
  WEDNESDAY = "WEDNESDAY",
  THURSDAY = "THURSDAY",
  FRIDAY = "FRIDAY",
  SATURDAY = "SATURDAY",
  SUNDAY = "SUNDAY",
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  business_name?: string;

  @IsOptional()
  @IsString()
  closingTime?:string

  @IsOptional()
  @IsString()
  openingTime?:string

  @IsOptional()
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  operatingDays:string[]
}
