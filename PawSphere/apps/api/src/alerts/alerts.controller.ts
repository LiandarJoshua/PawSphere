import { Controller, Get, Post, Param, Body, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { User } from '@prisma/client';

@ApiTags('alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post('lost')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report a lost pet — returns a unique qr_tag_id' })
  create(@CurrentUser() user: User, @Body() dto: CreateAlertDto) {
    return this.alertsService.create(user, dto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: "List the current user's active alerts" })
  findAll(@CurrentUser() user: User) {
    return this.alertsService.findAll(user);
  }

  @Get('qr/:qrTagId')
  @Public()
  @ApiOperation({ summary: 'Public QR tag lookup — no auth needed' })
  findByQrTag(@Param('qrTagId') qrTagId: string) {
    return this.alertsService.getByQrTag(qrTagId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single alert by id' })
  findOne(@Param('id') id: string) {
    return this.alertsService.findOne(id);
  }

  @Patch(':id/resolve')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark alert as FOUND' })
  resolve(@CurrentUser() user: User, @Param('id') id: string) {
    return this.alertsService.resolve(user, id);
  }
}
