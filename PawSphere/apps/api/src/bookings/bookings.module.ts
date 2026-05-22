import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { PaymentsService } from './payments.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [BookingsService, PaymentsService],
  controllers: [BookingsController],
  exports: [BookingsService],
})
export class BookingsModule {}
