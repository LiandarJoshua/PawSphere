import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { CreateWeightLogDto } from './dto/create-weight-log.dto';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { CreateVetVisitDto } from './dto/create-vet-visit.dto';
import { LogActivityDto } from './dto/log-activity.dto';

@ApiTags('health')
@ApiBearerAuth()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('pets/:petId/weight-logs')
  getWeightLogs(@Param('petId') petId: string) {
    return this.healthService.getWeightLogs(petId);
  }

  @Post('pets/:petId/weight-logs')
  addWeightLog(@Param('petId') petId: string, @Body() dto: CreateWeightLogDto) {
    return this.healthService.addWeightLog(petId, dto);
  }

  @Get('pets/:petId/medications')
  getMedications(@Param('petId') petId: string) {
    return this.healthService.getMedications(petId);
  }

  @Post('pets/:petId/medications')
  addMedication(@Param('petId') petId: string, @Body() dto: CreateMedicationDto) {
    return this.healthService.addMedication(petId, dto);
  }

  @Patch('pets/:petId/medications/:id/stop')
  stopMedication(@Param('id') id: string) {
    return this.healthService.stopMedication(id);
  }

  @Get('pets/:petId/vet-visits')
  getVetVisits(@Param('petId') petId: string) {
    return this.healthService.getVetVisits(petId);
  }

  @Post('pets/:petId/vet-visits')
  addVetVisit(@Param('petId') petId: string, @Body() dto: CreateVetVisitDto) {
    return this.healthService.addVetVisit(petId, dto);
  }

  @Patch('vet-visits/:id/documents')
  updateVetVisitDocuments(@Param('id') id: string, @Body('documentUrls') documentUrls: string[]) {
    return this.healthService.updateVetVisitDocuments(id, documentUrls);
  }

  @Patch('vaccinations/:id/documents')
  updateVaccinationDocuments(@Param('id') id: string, @Body('documentUrls') documentUrls: string[]) {
    return this.healthService.updateVaccinationDocuments(id, documentUrls);
  }

  @Get('pets/:petId/weight-trend')
  getWeightTrend(@Param('petId') petId: string) {
    return this.healthService.getWeightTrend(petId);
  }

  @Get('pets/:petId/summary')
  getHealthSummary(@Param('petId') petId: string) {
    return this.healthService.getHealthSummary(petId);
  }

  @Post('pets/:petId/activity')
  logActivity(@Param('petId') petId: string, @Body() dto: LogActivityDto) {
    return this.healthService.logActivity(petId, dto);
  }

  @Get('pets/:petId/activity')
  getActivityLogs(@Param('petId') petId: string, @Query('limit') limit?: string) {
    return this.healthService.getActivityLogs(petId, limit ? parseInt(limit, 10) : 50);
  }
}
