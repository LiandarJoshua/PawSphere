import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UpsertSitterProfileDto } from './dto/upsert-sitter-profile.dto';
import { CreateSitterBookingDto } from './dto/create-sitter-booking.dto';
import { CreateSitterReviewDto } from './dto/create-sitter-review.dto';

const SITTER_INCLUDE = {
  user: { select: { id: true, email: true } },
  reviews: {
    orderBy: { createdAt: 'desc' as const },
    take: 20,
    include: { reviewer: { select: { id: true, email: true } } },
  },
};

@Injectable()
export class SittersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(city?: string, available?: boolean, specialty?: string) {
    return this.prisma.sitterProfile.findMany({
      where: {
        ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
        ...(available !== undefined ? { isAvailable: available } : {}),
        ...(specialty ? { specialties: { has: specialty } } : {}),
      },
      include: SITTER_INCLUDE,
      orderBy: { rating: 'desc' },
    });
  }

  async getById(id: string) {
    const profile = await this.prisma.sitterProfile.findUnique({
      where: { id },
      include: SITTER_INCLUDE,
    });
    if (!profile) throw new NotFoundException('Sitter not found');
    return profile;
  }

  async getMyProfile(userId: string) {
    return this.prisma.sitterProfile.findUnique({
      where: { userId },
      include: SITTER_INCLUDE,
    });
  }

  async upsertProfile(userId: string, dto: UpsertSitterProfileDto) {
    return this.prisma.sitterProfile.upsert({
      where: { userId },
      create: {
        userId,
        displayName: dto.displayName,
        bio: dto.bio,
        experience: dto.experience,
        hourlyRate: dto.hourlyRate,
        dailyRate: dto.dailyRate,
        phone: dto.phone,
        city: dto.city,
        latitude: dto.latitude,
        longitude: dto.longitude,
        isAvailable: dto.isAvailable ?? true,
        specialties: dto.specialties ?? [],
      },
      update: {
        displayName: dto.displayName,
        bio: dto.bio,
        experience: dto.experience,
        hourlyRate: dto.hourlyRate,
        dailyRate: dto.dailyRate,
        phone: dto.phone,
        city: dto.city,
        latitude: dto.latitude,
        longitude: dto.longitude,
        isAvailable: dto.isAvailable ?? true,
        specialties: dto.specialties ?? [],
      },
      include: SITTER_INCLUDE,
    });
  }

  async createBooking(ownerId: string, dto: CreateSitterBookingDto) {
    const sitter = await this.prisma.sitterProfile.findUnique({ where: { id: dto.sitterId } });
    if (!sitter) throw new NotFoundException('Sitter not found');
    if (!sitter.isAvailable) throw new BadRequestException('Sitter is not currently available');

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end <= start) throw new BadRequestException('End date must be after start date');

    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const totalPrice = sitter.dailyRate ? sitter.dailyRate * days : sitter.hourlyRate * 8 * days;

    const booking = await this.prisma.sitterBooking.create({
      data: {
        sitterId: dto.sitterId,
        ownerId,
        petId: dto.petId,
        startDate: start,
        endDate: end,
        notes: dto.notes,
        totalPrice,
      },
      include: {
        sitter: { select: { displayName: true, phone: true, city: true } },
        pet: { select: { name: true, species: true } },
      },
    });

    await this.notifications.sendPush(
      [sitter.userId],
      'New Sitting Request',
      'New sitting request from a pet owner',
      { bookingId: booking.id },
    );

    return booking;
  }

  async getMyBookings(ownerId: string) {
    return this.prisma.sitterBooking.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      include: {
        sitter: { select: { displayName: true, phone: true, city: true, rating: true } },
        pet: { select: { name: true, species: true } },
      },
    });
  }

  async getMySitterBookings(userId: string) {
    const profile = await this.prisma.sitterProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('You do not have a sitter profile');
    return this.prisma.sitterBooking.findMany({
      where: { sitterId: profile.id },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { email: true } },
        pet: { select: { name: true, species: true } },
      },
    });
  }

  async updateBookingStatus(userId: string, bookingId: string, status: string) {
    const profile = await this.prisma.sitterProfile.findUnique({ where: { userId } });
    const booking = await this.prisma.sitterBooking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (!profile || booking.sitterId !== profile.id) throw new ForbiddenException();

    const updated = await this.prisma.sitterBooking.update({
      where: { id: bookingId },
      data: { status: status as 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED' },
    });

    if (status === 'ACCEPTED') {
      await this.notifications.sendPush(
        [booking.ownerId],
        'Booking Accepted',
        'Your sitter booking was accepted!',
        { bookingId },
      );
    } else if (status === 'REJECTED') {
      await this.notifications.sendPush(
        [booking.ownerId],
        'Booking Rejected',
        'Your sitter booking was rejected.',
        { bookingId },
      );
    } else if (status === 'COMPLETED') {
      await this.notifications.sendPush(
        [booking.ownerId],
        'Booking Complete',
        'Your sitter booking is complete! Leave a review.',
        { bookingId },
      );
    }

    return updated;
  }

  async addReview(reviewerId: string, dto: CreateSitterReviewDto) {
    const sitter = await this.prisma.sitterProfile.findUnique({ where: { id: dto.sitterId } });
    if (!sitter) throw new NotFoundException('Sitter not found');
    if (sitter.userId === reviewerId) throw new BadRequestException('Cannot review yourself');

    const review = await this.prisma.sitterReview.create({
      data: { sitterId: dto.sitterId, reviewerId, rating: dto.rating, comment: dto.comment },
    });

    const agg = await this.prisma.sitterReview.aggregate({
      where: { sitterId: dto.sitterId },
      _avg: { rating: true },
      _count: true,
    });
    await this.prisma.sitterProfile.update({
      where: { id: dto.sitterId },
      data: { rating: agg._avg.rating ?? 0, reviewCount: agg._count },
    });

    return review;
  }

  async addAvailability(userId: string, startDate: string, endDate: string) {
    const profile = await this.prisma.sitterProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('You do not have a sitter profile');
    return this.prisma.sitterAvailability.create({
      data: {
        sitterId: profile.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });
  }

  async getAvailability(sitterId: string) {
    return this.prisma.sitterAvailability.findMany({
      where: { sitterId },
      orderBy: { startDate: 'asc' },
    });
  }

  async removeAvailability(userId: string, availId: string) {
    const profile = await this.prisma.sitterProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('You do not have a sitter profile');
    const avail = await this.prisma.sitterAvailability.findUnique({ where: { id: availId } });
    if (!avail || avail.sitterId !== profile.id) throw new ForbiddenException();
    await this.prisma.sitterAvailability.delete({ where: { id: availId } });
    return { success: true };
  }
}
