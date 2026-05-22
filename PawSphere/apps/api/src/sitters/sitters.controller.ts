import {
  Controller, Get, Post, Body, Param, Query, Patch, Delete,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { SittersService } from './sitters.service';
import { UpsertSitterProfileDto } from './dto/upsert-sitter-profile.dto';
import { CreateSitterBookingDto } from './dto/create-sitter-booking.dto';
import { CreateSitterReviewDto } from './dto/create-sitter-review.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('sitters')
@ApiBearerAuth()
@Controller('sitters')
export class SittersController {
  constructor(private readonly sittersService: SittersService) {}

  @Get()
  @ApiOperation({ summary: 'List all pet sitters' })
  list(
    @Query('city') city?: string,
    @Query('available') available?: string,
    @Query('specialty') specialty?: string,
  ) {
    const avail = available === 'true' ? true : available === 'false' ? false : undefined;
    return this.sittersService.list(city, avail, specialty);
  }

  @Get('me/profile')
  @ApiOperation({ summary: 'Get my sitter profile' })
  getMyProfile(@CurrentUser() user: User) {
    return this.sittersService.getMyProfile(user.id);
  }

  @Post('me/profile')
  @ApiOperation({ summary: 'Create or update my sitter profile' })
  upsertProfile(@CurrentUser() user: User, @Body() dto: UpsertSitterProfileDto) {
    return this.sittersService.upsertProfile(user.id, dto);
  }

  @Get('me/bookings')
  @ApiOperation({ summary: 'Get bookings I made as a pet owner' })
  getMyBookings(@CurrentUser() user: User) {
    return this.sittersService.getMyBookings(user.id);
  }

  @Get('me/sitter-bookings')
  @ApiOperation({ summary: 'Get bookings for my sitter profile' })
  getMySitterBookings(@CurrentUser() user: User) {
    return this.sittersService.getMySitterBookings(user.id);
  }

  @Post('availability')
  @ApiOperation({ summary: 'Add availability date range' })
  addAvailability(
    @CurrentUser() user: User,
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
  ) {
    return this.sittersService.addAvailability(user.id, startDate, endDate);
  }

  @Delete('availability/:id')
  @ApiOperation({ summary: 'Remove an availability period' })
  removeAvailability(@CurrentUser() user: User, @Param('id') id: string) {
    return this.sittersService.removeAvailability(user.id, id);
  }

  @Patch('bookings/:id/status')
  @ApiOperation({ summary: 'Accept or reject a booking (sitter only)' })
  updateBookingStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.sittersService.updateBookingStatus(user.id, id, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a sitter profile by ID' })
  getById(@Param('id') id: string) {
    return this.sittersService.getById(id);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Get availability for a sitter' })
  getAvailability(@Param('id') id: string) {
    return this.sittersService.getAvailability(id);
  }

  @Post('bookings')
  @ApiOperation({ summary: 'Book a pet sitter' })
  createBooking(@CurrentUser() user: User, @Body() dto: CreateSitterBookingDto) {
    return this.sittersService.createBooking(user.id, dto);
  }

  @Post('reviews')
  @ApiOperation({ summary: 'Leave a review for a sitter' })
  addReview(@CurrentUser() user: User, @Body() dto: CreateSitterReviewDto) {
    return this.sittersService.addReview(user.id, dto);
  }
}
