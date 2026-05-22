import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  listProviders(verified?: boolean) {
    return this.prisma.provider.findMany({
      where: verified !== undefined ? { isVerified: verified } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  verifyProvider(id: string, isVerified: boolean) {
    return this.prisma.provider.update({ where: { id }, data: { isVerified } });
  }

  listUsers(role?: string) {
    return this.prisma.user.findMany({
      where: role ? { role: role as 'OWNER' | 'PROVIDER' | 'ADMIN' } : {},
      select: { id: true, email: true, displayName: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  getStats() {
    return Promise.all([
      this.prisma.user.count(),
      this.prisma.pet.count(),
      this.prisma.booking.count(),
      this.prisma.provider.count(),
      this.prisma.sitterProfile.count(),
      this.prisma.post.count(),
    ]).then(([users, pets, bookings, providers, sitters, posts]) => ({
      users, pets, bookings, providers, sitters, posts,
    }));
  }
}
