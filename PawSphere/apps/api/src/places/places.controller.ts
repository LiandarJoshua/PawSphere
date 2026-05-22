import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PlacesService } from './places.service';
import { AiService } from '../ai/ai.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('places')
@ApiBearerAuth()
@Controller('places')
export class PlacesController {
  constructor(
    private readonly placesService: PlacesService,
    private readonly aiService: AiService,
  ) {}

  @Get('photo')
  @Public()
  @ApiOperation({ summary: 'Proxy a Google Places photo (keeps API key server-side)' })
  async proxyPhoto(@Query('ref') ref: string, @Res() res: Response) {
    if (!ref || !this.placesService.apiKey) {
      return res.status(404).json({ message: 'Not available' });
    }
    try {
      const { buffer, contentType } = await this.placesService.fetchPhoto(ref);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.end(buffer);
    } catch {
      res.status(502).json({ message: 'Photo fetch failed' });
    }
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Find nearby pet service places (Google Places or OSM fallback)' })
  findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius = '10',
    @Query('type') type?: string,
  ) {
    return this.placesService.findNearby(parseFloat(lat), parseFloat(lng), parseFloat(radius), type);
  }

  @Get(':id/detail')
  @ApiOperation({ summary: 'Get full details for a place (Google Places)' })
  getDetail(
    @Param('id') id: string,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    return this.placesService.getDetail(id, parseFloat(lat), parseFloat(lng));
  }

  @Get(':id/ai-description')
  @ApiOperation({ summary: 'Generate an AI description for a place using Gemini' })
  async getAiDescription(
    @Param('id') id: string,
    @Query('name') name: string,
    @Query('type') type: string,
    @Query('rating') rating?: string,
    @Query('reviews') reviews?: string,
    @Query('address') address?: string,
  ) {
    const description = await this.aiService.describePetPlace(
      name,
      type,
      rating ? parseFloat(rating) : null,
      reviews ? parseInt(reviews, 10) : null,
      address ?? '',
    );
    return { description };
  }
}
