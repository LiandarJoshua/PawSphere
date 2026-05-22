import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { User } from '@prisma/client';
import { randomBytes } from 'crypto';

function generateQrTagId(): string {
  const part = (n: number) => randomBytes(n).toString('hex').toUpperCase();
  return `PAW-${part(2)}-${part(2)}-${part(2)}`;
}

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: User, dto: CreateAlertDto) {
    // Verify the pet belongs to the requesting user's household
    const pet = await this.prisma.pet.findFirst({
      where: {
        id: dto.petId,
        household: { ownerId: user.id },
      },
    });
    if (!pet) throw new NotFoundException('Pet not found or does not belong to you');

    // Ensure qr_tag_id is globally unique (retry on collision — astronomically rare)
    let qrTagId: string;
    let attempts = 0;
    do {
      qrTagId = generateQrTagId();
      attempts++;
    } while (attempts < 5 && (await this.prisma.lostPetAlert.findUnique({ where: { qrTagId } })));

    return this.prisma.lostPetAlert.create({
      data: {
        userId: user.id,
        petId: dto.petId,
        qrTagId,
        lastSeenLat: dto.lastSeenLat,
        lastSeenLng: dto.lastSeenLng,
        lastSeenAddress: dto.lastSeenAddress,
        description: dto.description,
        contactPhone: dto.contactPhone,
      },
      include: { pet: true },
    });
  }

  async findAll(user: User) {
    return this.prisma.lostPetAlert.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { pet: true },
    });
  }

  async findOne(id: string) {
    const alert = await this.prisma.lostPetAlert.findUnique({
      where: { id },
      include: { pet: true },
    });
    if (!alert) throw new NotFoundException('Alert not found');
    return alert;
  }

  async findByQrTag(qrTagId: string) {
    const alert = await this.prisma.lostPetAlert.findUnique({
      where: { qrTagId },
      include: { pet: true },
    });
    if (!alert) throw new NotFoundException('QR tag not found');
    return alert;
  }

  async getByQrTag(tagId: string) {
    const alert = await this.prisma.lostPetAlert.findUnique({
      where: { qrTagId: tagId },
      include: {
        pet: { select: { name: true, species: true, breed: true, avatarUrl: true } },
        user: { select: { displayName: true, phone: true } },
      },
    });
    if (!alert) throw new NotFoundException('QR tag not found or no active alert');
    return alert;
  }

  async resolve(user: User, id: string) {
    const alert = await this.prisma.lostPetAlert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException('Alert not found');
    if (alert.userId !== user.id) throw new ForbiddenException();

    return this.prisma.lostPetAlert.update({
      where: { id },
      data: { status: 'FOUND' },
      include: { pet: true },
    });
  }
}
