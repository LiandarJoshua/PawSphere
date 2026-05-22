import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterTokenDto } from './dto/register-token.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registerToken(userId: string, dto: RegisterTokenDto) {
    return this.prisma.pushToken.upsert({
      where: { userId_token: { userId, token: dto.token } },
      update: { platform: dto.platform },
      create: { userId, token: dto.token, platform: dto.platform },
    });
  }

  async removeToken(userId: string, token: string) {
    await this.prisma.pushToken.deleteMany({ where: { userId, token } });
    return { success: true };
  }

  async sendPush(
    userIds: string[],
    title: string,
    body: string,
    data: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      const tokens = await this.prisma.pushToken.findMany({
        where: { userId: { in: userIds } },
        select: { token: true },
      });
      if (tokens.length === 0) return;
      const messages = tokens.map((t) => ({
        to: t.token,
        title,
        body,
        data,
        sound: 'default',
      }));
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
    } catch (err) {
      this.logger.error(`Push send failed: ${err}`);
    }
  }
}
