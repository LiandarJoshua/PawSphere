import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { User } from '@prisma/client';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(user: User, dto: CreateBookingDto) {
    const household = await this.prisma.household.findUnique({ where: { ownerId: user.id } });
    if (!household) throw new NotFoundException('No household found for this user.');

    const pet = await this.prisma.pet.findUnique({ where: { id: dto.petId } });
    if (!pet || pet.householdId !== household.id) {
      throw new ForbiddenException('Pet does not belong to this user.');
    }

    const provider = await this.prisma.provider.findUnique({ where: { id: dto.providerId } });
    if (!provider) throw new NotFoundException(`Provider ${dto.providerId} not found.`);

    let scheduledAt = new Date(dto.scheduledAt);
    let totalPrice = dto.totalPrice;

    if (dto.timeSlotId) {
      const slot = await this.prisma.timeSlot.findUnique({ where: { id: dto.timeSlotId } });
      if (!slot) throw new NotFoundException('Time slot not found');
      if (slot.isBooked) throw new ForbiddenException('Time slot is already booked');
      scheduledAt = slot.startsAt;
      totalPrice = slot.price ?? dto.totalPrice ?? 0;
    }

    const booking = await this.prisma.booking.create({
      data: {
        userId: user.id,
        providerId: dto.providerId,
        petId: dto.petId,
        scheduledAt,
        totalPrice,
        notes: dto.notes,
        status: 'PENDING',
        timeSlotId: dto.timeSlotId ?? null,
      },
      include: { provider: true, pet: true, timeSlot: true },
    });

    if (dto.timeSlotId) {
      await this.prisma.timeSlot.update({ where: { id: dto.timeSlotId }, data: { isBooked: true } });
    }

    if (provider.userId) {
      await this.notifications.sendPush(
        [provider.userId],
        'New Booking Request',
        `You have a new booking for ${new Date(scheduledAt).toLocaleDateString()}`,
        { bookingId: booking.id },
      );
    }

    return booking;
  }

  async findAll(user: User) {
    return this.prisma.booking.findMany({
      where: { userId: user.id },
      include: { provider: true, pet: true, timeSlot: true },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async findOne(user: User, id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { provider: true, pet: true, timeSlot: true },
    });
    if (!booking) throw new NotFoundException(`Booking ${id} not found.`);
    if (booking.userId !== user.id) throw new ForbiddenException('Access denied.');
    return booking;
  }

  async cancel(user: User, id: string) {
    const booking = await this.findOne(user, id);

    let refundId: string | undefined;

    if (booking.stripePaymentIntentId) {
      try {
        refundId = await this.payments.refundPaymentIntent(booking.stripePaymentIntentId);
      } catch (err) {
        this.logger.error(`Refund failed for booking ${id}: ${err}`);
      }
    }

    if (booking.timeSlotId) {
      await this.prisma.timeSlot.update({
        where: { id: booking.timeSlotId },
        data: { isBooked: false },
      }).catch(() => {});
    }

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED', ...(refundId ? { refundId } : {}) },
    });

    const provider = await this.prisma.provider.findUnique({ where: { id: booking.providerId } });
    if (provider?.userId) {
      await this.notifications.sendPush(
        [provider.userId],
        'Booking Cancelled',
        'A booking was cancelled',
        { bookingId: booking.id },
      );
    }

    return updated;
  }

  async createPaymentIntent(user: User, bookingId: string) {
    const booking = await this.findOne(user, bookingId);
    const { clientSecret, id } = await this.payments.createPaymentIntent(booking.totalPrice);

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { stripePaymentIntentId: id },
    });

    return { clientSecret, paymentIntentId: id };
  }

  async getPaymentHistory(user: User) {
    return this.prisma.booking.findMany({
      where: { userId: user.id, stripePaymentIntentId: { not: null } },
      include: { provider: true, pet: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
