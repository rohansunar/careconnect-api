import { Controller, Get } from '@nestjs/common';
import { AppService } from '../services/app.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Get App Running Status',
    description: 'Retrieve App Running Status.',
  })
  @ApiResponse({ status: 200, description: 'App Running successfully.' })
  getHello(): string {
    return this.appService.getHello();
  }
}
