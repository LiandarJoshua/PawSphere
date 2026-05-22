import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { CreateVaccinationDto } from './dto/create-vaccination.dto';
import { User } from '@prisma/client';

@Injectable()
export class PetsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateHousehold(user: User) {
    const existing = await this.prisma.household.findUnique({
      where: { ownerId: user.id },
    });
    if (existing) return existing;

    return this.prisma.household.create({
      data: {
        name: `${user.email.split('@')[0]}'s Household`,
        ownerId: user.id,
      },
    });
  }

  private async getPetForUser(petId: string, user: User) {
    const household = await this.prisma.household.findUnique({
      where: { ownerId: user.id },
    });
    if (!household) throw new NotFoundException('No household found for this user.');

    const pet = await this.prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) throw new NotFoundException(`Pet ${petId} not found.`);
    if (pet.householdId !== household.id) throw new ForbiddenException('Access denied.');

    return pet;
  }

  async findAll(user: User) {
    const household = await this.prisma.household.findUnique({
      where: { ownerId: user.id },
      include: { pets: { orderBy: { createdAt: 'asc' } } },
    });
    return household?.pets ?? [];
  }

  async create(user: User, dto: CreatePetDto) {
    const household = await this.getOrCreateHousehold(user);
    return this.prisma.pet.create({
      data: {
        householdId: household.id,
        name: dto.name,
        species: dto.species,
        breed: dto.breed,
        dob: dto.dob ? new Date(dto.dob) : undefined,
        avatarUrl: dto.avatarUrl,
        medicalInfo: dto.medicalInfo,
      },
    });
  }

  async findOne(user: User, petId: string) {
    return this.getPetForUser(petId, user);
  }

  async update(user: User, petId: string, dto: UpdatePetDto) {
    await this.getPetForUser(petId, user);
    return this.prisma.pet.update({
      where: { id: petId },
      data: {
        ...dto,
        dob: dto.dob ? new Date(dto.dob) : undefined,
      },
    });
  }

  async remove(user: User, petId: string) {
    await this.getPetForUser(petId, user);
    await this.prisma.pet.delete({ where: { id: petId } });
    return { deleted: true };
  }

  async findVaccinations(user: User, petId: string) {
    await this.getPetForUser(petId, user);
    return this.prisma.vaccination.findMany({
      where: { petId },
      orderBy: { administeredAt: 'desc' },
    });
  }

  async addVaccination(user: User, petId: string, dto: CreateVaccinationDto) {
    await this.getPetForUser(petId, user);
    return this.prisma.vaccination.create({
      data: {
        petId,
        vaccineName: dto.vaccineName,
        administeredAt: new Date(dto.administeredAt),
        nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : undefined,
        notes: dto.notes,
      },
    });
  }

  async inviteHouseholdMember(ownerId: string, inviteeEmail: string) {
    const household = await this.prisma.household.findUnique({ where: { ownerId } });
    if (!household) throw new NotFoundException('No household found');
    const invitee = await this.prisma.user.findUnique({ where: { email: inviteeEmail } });
    if (!invitee) throw new NotFoundException('User not found with that email');
    return this.prisma.householdMember.upsert({
      where: { householdId_userId: { householdId: household.id, userId: invitee.id } },
      update: {},
      create: { householdId: household.id, userId: invitee.id },
      include: { user: { select: { id: true, email: true, displayName: true, avatarUrl: true } } },
    });
  }

  async getHouseholdMembers(ownerId: string) {
    const household = await this.prisma.household.findUnique({ where: { ownerId } });
    if (!household) return [];
    return this.prisma.householdMember.findMany({
      where: { householdId: household.id },
      include: { user: { select: { id: true, email: true, displayName: true, avatarUrl: true } } },
    });
  }

  async removeHouseholdMember(ownerId: string, memberId: string) {
    const household = await this.prisma.household.findUnique({ where: { ownerId } });
    if (!household) throw new NotFoundException('No household found');
    await this.prisma.householdMember.deleteMany({
      where: { householdId: household.id, userId: memberId },
    });
    return { success: true };
  }
}
