import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { ServiceType } from '@prisma/client';
import { Prisma } from '@prisma/client';

interface ProviderRaw {
  id: string;
  user_id: string | null;
  service_type: ServiceType;
  business_name: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  website_url: string | null;
  latitude: number;
  longitude: number;
  rating: number;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
  distance_km: number;
}

export interface ProviderWithDistance {
  id: string;
  serviceType: ServiceType;
  businessName: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  websiteUrl: string | null;
  latitude: number;
  longitude: number;
  rating: number;
  isVerified: boolean;
  distance_km: number;
}

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findNearby(query: NearbyQueryDto): Promise<ProviderWithDistance[]> {
    const { lat, lng, radius = 10, type } = query;
    const radiusMeters = radius * 1000;

    // Use PostGIS ST_DWithin for radius filter and ST_Distance for ordering.
    // lat/lng are stored as plain floats and cast to geography on the fly.
    const typeFilter = type
      ? Prisma.sql`AND p.service_type = ${type}::"ServiceType"`
      : Prisma.sql``;

    const rows = await this.prisma.$queryRaw<ProviderRaw[]>`
      SELECT
        p.*,
        ROUND(
          (ST_Distance(
            ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint(${lng}::float, ${lat}::float), 4326)::geography
          ) / 1000)::numeric,
          2
        )::float AS distance_km
      FROM providers p
      WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${lng}::float, ${lat}::float), 4326)::geography,
        ${radiusMeters}::float
      )
      ${typeFilter}
      ORDER BY distance_km ASC
    `;

    return rows.map((p) => ({
      id: p.id,
      serviceType: p.service_type,
      businessName: p.business_name,
      description: p.description,
      phone: p.phone,
      address: p.address,
      websiteUrl: p.website_url,
      latitude: p.latitude,
      longitude: p.longitude,
      rating: Number(p.rating),
      isVerified: p.is_verified,
      distance_km: Number(p.distance_km),
    }));
  }

  async findAll() {
    return this.prisma.provider.findMany({ orderBy: { businessName: 'asc' } });
  }

  async findOne(id: string) {
    return this.prisma.provider.findUniqueOrThrow({ where: { id } });
  }

  async getSlots(providerId: string, date: string) {
    const day = new Date(date);
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
    const end   = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
    return this.prisma.timeSlot.findMany({
      where: { providerId, isBooked: false, startsAt: { gte: start, lte: end } },
      orderBy: { startsAt: 'asc' },
    });
  }

  async createSlot(providerId: string, dto: { startsAt: string; durationMin?: number; price?: number; label?: string }) {
    const provider = await this.prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Provider not found');
    return this.prisma.timeSlot.create({
      data: {
        providerId,
        startsAt: new Date(dto.startsAt),
        durationMin: dto.durationMin ?? 30,
        price: dto.price ?? null,
        label: dto.label ?? null,
      },
    });
  }

  async generateDemoSlots(providerId: string) {
    const provider = await this.prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Provider not found');

    // Clear future unbooked slots first so we don't duplicate
    await this.prisma.timeSlot.deleteMany({
      where: { providerId, isBooked: false, startsAt: { gte: new Date() } },
    });

    const hours = [9, 10, 11, 14, 15, 16, 17];
    const data: any[] = [];
    for (let d = 1; d <= 7; d++) {
      const base = new Date();
      base.setDate(base.getDate() + d);
      for (const h of hours) {
        const startsAt = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, 0, 0);
        data.push({
          providerId,
          startsAt,
          durationMin: 30,
          price: Math.round(provider.rating * 20 + 80),
          label: h < 12 ? 'Morning Appointment' : 'Afternoon Appointment',
        });
      }
    }
    await this.prisma.timeSlot.createMany({ data });
    return { created: data.length };
  }

  async getProviderBookings(providerId: string) {
    return this.prisma.booking.findMany({
      where: { providerId },
      include: {
        pet: { select: { name: true, species: true } },
        timeSlot: { select: { startsAt: true, durationMin: true, label: true } },
      },
      orderBy: { scheduledAt: 'desc' },
      take: 50,
    });
  }

  async getMyBookings(userId: string) {
    const provider = await this.prisma.provider.findFirst({ where: { userId } });
    if (!provider) return [];
    return this.prisma.booking.findMany({
      where: { providerId: provider.id },
      include: {
        pet: { select: { name: true, species: true } },
        user: { select: { email: true, displayName: true } },
        timeSlot: { select: { startsAt: true, durationMin: true, label: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async getMyEarnings(userId: string) {
    const provider = await this.prisma.provider.findFirst({ where: { userId } });
    if (!provider) return { total: 0 };
    const result = await this.prisma.booking.aggregate({
      where: { providerId: provider.id, status: 'COMPLETED' },
      _sum: { totalPrice: true },
    });
    return { total: result._sum.totalPrice ?? 0 };
  }

  async getMyTimeslots(userId: string) {
    const provider = await this.prisma.provider.findFirst({ where: { userId } });
    if (!provider) return [];
    return this.prisma.timeSlot.findMany({
      where: { providerId: provider.id },
      orderBy: { startsAt: 'asc' },
      take: 100,
    });
  }

  async createMyTimeslot(
    userId: string,
    dto: { startsAt: string; durationMin?: number; price?: number; label?: string },
  ) {
    const provider = await this.prisma.provider.findFirst({ where: { userId } });
    if (!provider) throw new NotFoundException('Provider profile not found for this user');
    return this.createSlot(provider.id, dto);
  }
}
