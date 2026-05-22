import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async saveMessage(bookingId: string, senderId: string, content: string) {
    return this.prisma.message.create({
      data: { bookingId, senderId, content },
      include: {
        sender: { select: { id: true, email: true } },
      },
    });
  }

  async getHistory(bookingId: string, limit = 50) {
    const messages = await this.prisma.message.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: { sender: { select: { id: true, email: true } } },
    });
    return messages;
  }

  async verifyBookingParticipant(bookingId: string, userId: string): Promise<boolean> {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        OR: [{ userId }, { provider: { userId } }],
      },
    });
    return !!booking;
  }
}
