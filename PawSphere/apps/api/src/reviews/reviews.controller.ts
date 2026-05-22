import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateProviderReviewDto } from './dto/create-provider-review.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { User } from '@prisma/client';

@ApiTags('reviews')
@Controller('providers')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post(':providerId/reviews')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a review for a provider' })
  addReview(
    @CurrentUser() user: User,
    @Param('providerId') providerId: string,
    @Body() dto: CreateProviderReviewDto,
  ) {
    return this.reviewsService.addProviderReview(user.id, { ...dto, providerId });
  }

  @Get(':providerId/reviews')
  @Public()
  @ApiOperation({ summary: 'Get reviews for a provider' })
  getReviews(@Param('providerId') providerId: string) {
    return this.reviewsService.getProviderReviews(providerId);
  }
}
