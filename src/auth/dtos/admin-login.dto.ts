/**
 * DTO for admin login request.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class AdminLoginDto {
  @IsString()
  @ApiProperty({
    description: 'Admin email address',
    example: 'admin@example.com',
  })
  @IsNotEmpty()
  email: string;
  @IsString()
  @ApiProperty({
    description: 'Admin password',
    example: 'securepassword123',
  })
  @IsNotEmpty()
  password: string;
}
