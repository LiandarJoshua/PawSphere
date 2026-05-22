import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProviderReviewDto } from './dto/create-provider-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async addProviderReview(reviewerId: string, dto: CreateProviderReviewDto) {
    const provider = await this.prisma.provider.findUnique({ where: { id: dto.providerId } });
    if (!provider) throw new NotFoundException('Provider not found');

    const review = await this.prisma.providerReview.create({
      data: {
        providerId: dto.providerId,
        reviewerId,
        bookingId: dto.bookingId ?? null,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        reviewer: { select: { id: true, email: true, displayName: true, avatarUrl: true } },
      },
    });

    const agg = await this.prisma.providerReview.aggregate({
      where: { providerId: dto.providerId },
      _avg: { rating: true },
    });
    await this.prisma.provider.update({
      where: { id: dto.providerId },
      data: { rating: agg._avg.rating ?? 0 },
    });

    return review;
  }

  async getProviderReviews(providerId: string) {
    return this.prisma.providerReview.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: { select: { id: true, email: true, displayName: true, avatarUrl: true } },
      },
    });
  }
}
