import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleIsProviderDto {
  @ApiProperty({
    description: 'Whether the user should be a provider',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  isProvider: boolean;
}
