import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { VendorBankAccountService } from '../services/vendor-bank-account.service';
import { CreateBankAccountDto } from '../dto/create-bank-account.dto';
import { UpdateBankAccountDto } from '../dto/update-bank-account.dto';
import { BankAccountResponseDto } from '../dto/bank-account-response.dto';

@ApiTags('Vendor Bank Accounts')
@Controller('vendor/bank-accounts')
@Roles('vendor')
export class VendorBankAccountController {
  constructor(
    private readonly vendorBankAccountService: VendorBankAccountService,
  ) {}

  /**
   * Get all bank accounts for the current vendor
   */
  @Get()
  @ApiOperation({
    summary: 'Get all bank accounts',
    description:
      'Retrieve all bank accounts associated with the current vendor',
  })
  @ApiResponse({
    status: 200,
    description: 'Bank accounts retrieved successfully',
    type: [BankAccountResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - vendor not authenticated',
  })
  @ApiResponse({
    status: 404,
    description: 'Vendor not found',
  })
  async getBankAccounts(@CurrentUser() vendor: any) {
    return this.vendorBankAccountService.getBankAccounts(vendor.id);
  }

  /**
   * Create a new bank account for the current vendor
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create bank account',
    description: 'Create a new bank account for the current vendor',
  })
  @ApiBody({ type: CreateBankAccountDto })
  @ApiResponse({
    status: 201,
    description: 'Bank account created successfully',
    type: BankAccountResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - vendor not authenticated',
  })
  @ApiResponse({
    status: 404,
    description: 'Vendor not found',
  })
  async createBankAccount(
    @CurrentUser() vendor: any,
    @Body() createBankAccountDto: CreateBankAccountDto,
  ) {
    return this.vendorBankAccountService.createBankAccount(
      vendor.id,
      createBankAccountDto,
    );
  }

  /**
   * Update a specific bank account for the current vendor
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update bank account',
    description: 'Update a specific bank account for the current vendor',
  })
  @ApiParam({
    name: 'id',
    description: 'Bank account ID',
    type: String,
  })
  @ApiBody({ type: UpdateBankAccountDto })
  @ApiResponse({
    status: 200,
    description: 'Bank account updated successfully',
    type: BankAccountResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - vendor not authenticated',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - vendor does not own this bank account',
  })
  @ApiResponse({
    status: 404,
    description: 'Bank account or vendor not found',
  })
  async updateBankAccount(
    @CurrentUser() vendor: any,
    @Param('id') bankAccountId: string,
    @Body() updateBankAccountDto: UpdateBankAccountDto,
  ) {
    return this.vendorBankAccountService.updateBankAccount(
      vendor.id,
      bankAccountId,
      updateBankAccountDto,
    );
  }

  /**
   * Delete a specific bank account for the current vendor
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete bank account',
    description: 'Delete a specific bank account for the current vendor',
  })
  @ApiParam({
    name: 'id',
    description: 'Bank account ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Bank account deleted successfully',
    type: BankAccountResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - cannot delete only bank account',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - vendor not authenticated',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - vendor does not own this bank account',
  })
  @ApiResponse({
    status: 404,
    description: 'Bank account or vendor not found',
  })
  async deleteBankAccount(
    @CurrentUser() vendor: any,
    @Param('id') bankAccountId: string,
  ) {
    return this.vendorBankAccountService.deleteBankAccount(
      vendor.id,
      bankAccountId,
    );
  }
}
