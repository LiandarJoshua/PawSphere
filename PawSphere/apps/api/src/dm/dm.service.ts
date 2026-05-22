import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const USER_SELECT = {
  id: true, email: true, displayName: true, avatarUrl: true,
} as const;

@Injectable()
export class DmService {
  constructor(private readonly prisma: PrismaService) {}

  async getConversations(myId: string) {
    const messages = await this.prisma.directMessage.findMany({
      where: { OR: [{ senderId: myId }, { recipientId: myId }] },
      include: {
        sender: { select: USER_SELECT },
        recipient: { select: USER_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    });

    const map = new Map<string, any>();
    for (const msg of messages) {
      const isFromMe = msg.senderId === myId;
      const partnerId = isFromMe ? msg.recipientId : msg.senderId;
      const partner = isFromMe ? msg.recipient : msg.sender;

      if (!map.has(partnerId)) {
        map.set(partnerId, {
          userId: partnerId,
          user: partner,
          lastMessage: {
            content: msg.content,
            createdAt: msg.createdAt.toISOString(),
            isFromMe,
          },
          unreadCount: 0,
        });
      }
      if (!isFromMe && !msg.isRead) {
        map.get(partnerId).unreadCount++;
      }
    }

    return Array.from(map.values());
  }

  async getMessages(myId: string, otherId: string) {
    const messages = await this.prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: myId, recipientId: otherId },
          { senderId: otherId, recipientId: myId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    await this.prisma.directMessage.updateMany({
      where: { senderId: otherId, recipientId: myId, isRead: false },
      data: { isRead: true },
    });

    return messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }));
  }

  async send(senderId: string, recipientId: string, content: string) {
    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
      select: USER_SELECT,
    });
    if (!recipient) throw new NotFoundException('User not found');

    const msg = await this.prisma.directMessage.create({
      data: { senderId, recipientId, content },
    });
    return { ...msg, createdAt: msg.createdAt.toISOString() };
  }

  async deleteConversation(myId: string, otherId: string) {
    await this.prisma.directMessage.deleteMany({
      where: {
        OR: [
          { senderId: myId, recipientId: otherId },
          { senderId: otherId, recipientId: myId },
        ],
      },
    });
    return { success: true };
  }
}
