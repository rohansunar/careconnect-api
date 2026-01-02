import { Controller, Get } from '@nestjs/common';
import { CitiesService } from '../services/cities.service';

/**
 * Controller for managing cities endpoints.
 */
@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  /**
   * Retrieves all cities.
   * @returns An array of cities.
   */
  @Get()
  async findAll() {
    return this.citiesService.findAll();
  }
}