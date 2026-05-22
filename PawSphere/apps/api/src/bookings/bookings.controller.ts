import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @ApiOperation({ summary: "List the current user's bookings" })
  findAll(@CurrentUser() user: User) {
    return this.bookingsService.findAll(user);
  }

  @Get('payment-history')
  @ApiOperation({ summary: 'Get payment history (bookings with Stripe payment intents)' })
  getPaymentHistory(@CurrentUser() user: User) {
    return this.bookingsService.getPaymentHistory(user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new booking (status: PENDING)' })
  create(@CurrentUser() user: User, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single booking' })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.bookingsService.findOne(user, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking' })
  cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.bookingsService.cancel(user, id);
  }

  @Post(':id/payment-intent')
  @ApiOperation({ summary: 'Create a Stripe payment intent for this booking' })
  paymentIntent(@CurrentUser() user: User, @Param('id') id: string) {
    return this.bookingsService.createPaymentIntent(user, id);
  }
}
