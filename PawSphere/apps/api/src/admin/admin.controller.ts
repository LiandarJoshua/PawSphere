import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get platform stats' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('providers')
  @ApiOperation({ summary: 'List providers (optionally filter by verified status)' })
  listProviders(@Query('verified') verified?: string) {
    const v = verified === 'true' ? true : verified === 'false' ? false : undefined;
    return this.adminService.listProviders(v);
  }

  @Patch('providers/:id/verify')
  @ApiOperation({ summary: 'Verify or unverify a provider' })
  verifyProvider(@Param('id') id: string, @Body('isVerified') isVerified: boolean) {
    return this.adminService.verifyProvider(id, isVerified);
  }

  @Get('users')
  @ApiOperation({ summary: 'List users (optionally filter by role)' })
  listUsers(@Query('role') role?: string) {
    return this.adminService.listUsers(role);
  }
}
