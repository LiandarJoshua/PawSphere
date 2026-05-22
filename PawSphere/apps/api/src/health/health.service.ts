import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWeightLogDto } from './dto/create-weight-log.dto';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { CreateVetVisitDto } from './dto/create-vet-visit.dto';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getWeightLogs(petId: string) {
    return this.prisma.weightLog.findMany({ where: { petId }, orderBy: { loggedAt: 'desc' }, take: 50 });
  }

  addWeightLog(petId: string, dto: CreateWeightLogDto) {
    return this.prisma.weightLog.create({ data: { petId, weight: dto.weight, notes: dto.notes } });
  }

  getMedications(petId: string) {
    return this.prisma.medication.findMany({ where: { petId }, orderBy: { createdAt: 'desc' } });
  }

  addMedication(petId: string, dto: CreateMedicationDto) {
    return this.prisma.medication.create({
      data: {
        petId,
        name: dto.name,
        dosage: dto.dosage,
        frequency: dto.frequency,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        notes: dto.notes,
      },
    });
  }

  stopMedication(id: string) {
    return this.prisma.medication.update({ where: { id }, data: { isActive: false, endDate: new Date() } });
  }

  getVetVisits(petId: string) {
    return this.prisma.vetVisit.findMany({ where: { petId }, orderBy: { visitDate: 'desc' } });
  }

  addVetVisit(petId: string, dto: CreateVetVisitDto) {
    return this.prisma.vetVisit.create({
      data: {
        petId,
        visitDate: new Date(dto.visitDate),
        reason: dto.reason,
        notes: dto.notes,
        vetName: dto.vetName,
        nextVisit: dto.nextVisit ? new Date(dto.nextVisit) : null,
        cost: dto.cost,
      },
    });
  }

  async updateVetVisitDocuments(id: string, documentUrls: string[]) {
    return this.prisma.vetVisit.update({ where: { id }, data: { documentUrls } });
  }

  async updateVaccinationDocuments(id: string, documentUrls: string[]) {
    return this.prisma.vaccination.update({ where: { id }, data: { documentUrls } });
  }

  async getWeightTrend(petId: string) {
    return this.prisma.weightLog.findMany({
      where: { petId },
      orderBy: { loggedAt: 'asc' },
      select: { weight: true, loggedAt: true, notes: true },
    });
  }

  async getHealthSummary(petId: string) {
    const [vaccinations, medications, vetVisits, weightLogs] = await Promise.all([
      this.prisma.vaccination.count({ where: { petId } }),
      this.prisma.medication.count({ where: { petId, isActive: true } }),
      this.prisma.vetVisit.findMany({ where: { petId }, orderBy: { visitDate: 'desc' }, take: 5 }),
      this.prisma.weightLog.findMany({ where: { petId }, orderBy: { loggedAt: 'desc' }, take: 10 }),
    ]);
    return { vaccinations, activeMedications: medications, recentVisits: vetVisits, recentWeights: weightLogs };
  }

  async logActivity(
    petId: string,
    dto: { type: string; notes?: string; durationMin?: number; amount?: string; loggedAt?: string },
  ) {
    return this.prisma.activityLog.create({
      data: {
        petId,
        type: dto.type,
        notes: dto.notes,
        durationMin: dto.durationMin,
        amount: dto.amount,
        loggedAt: dto.loggedAt ? new Date(dto.loggedAt) : new Date(),
      },
    });
  }

  async getActivityLogs(petId: string, limit = 50) {
    return this.prisma.activityLog.findMany({
      where: { petId },
      orderBy: { loggedAt: 'desc' },
      take: limit,
    });
  }
}
