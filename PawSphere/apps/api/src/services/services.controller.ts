import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('services')
@ApiBearerAuth()
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get('nearby')
  @ApiOperation({ summary: 'Find nearby providers using PostGIS geospatial query' })
  findNearby(@Query() query: NearbyQueryDto) {
    return this.servicesService.findNearby(query);
  }

  @Get('my/bookings')
  @ApiOperation({ summary: 'Get my bookings as a provider' })
  getMyBookings(@CurrentUser() user: User) {
    return this.servicesService.getMyBookings(user.id);
  }

  @Get('my/earnings')
  @ApiOperation({ summary: 'Get my earnings as a provider' })
  getMyEarnings(@CurrentUser() user: User) {
    return this.servicesService.getMyEarnings(user.id);
  }

  @Get('my/timeslots')
  @ApiOperation({ summary: 'Get my time slots as a provider' })
  getMyTimeslots(@CurrentUser() user: User) {
    return this.servicesService.getMyTimeslots(user.id);
  }

  @Post('timeslots')
  @ApiOperation({ summary: 'Create a time slot for my provider profile' })
  createMyTimeslot(@CurrentUser() user: User, @Body() body: { startsAt: string; durationMin?: number; price?: number; label?: string }) {
    return this.servicesService.createMyTimeslot(user.id, body);
  }

  @Get()
  @ApiOperation({ summary: 'List all providers' })
  findAll() {
    return this.servicesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single provider by ID' })
  findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @Get(':id/slots')
  @ApiOperation({ summary: 'Get available time slots for a provider on a given date' })
  getSlots(@Param('id') id: string, @Query('date') date: string) {
    return this.servicesService.getSlots(id, date ?? new Date().toISOString().split('T')[0]);
  }

  @Post(':id/slots')
  @ApiOperation({ summary: 'Create a time slot for a provider' })
  createSlot(@Param('id') id: string, @Body() body: { startsAt: string; durationMin?: number; price?: number; label?: string }) {
    return this.servicesService.createSlot(id, body);
  }

  @Post(':id/slots/generate-demo')
  @ApiOperation({ summary: 'Generate demo time slots for a provider (next 7 days)' })
  generateDemoSlots(@Param('id') id: string) {
    return this.servicesService.generateDemoSlots(id);
  }

  @Get(':id/bookings')
  @ApiOperation({ summary: 'Get all bookings for a provider' })
  getProviderBookings(@Param('id') id: string) {
    return this.servicesService.getProviderBookings(id);
  }
}
