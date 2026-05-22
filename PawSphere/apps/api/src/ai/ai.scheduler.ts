import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AiService } from './ai.service';

@Injectable()
export class AiScheduler {
  private readonly logger = new Logger(AiScheduler.name);

  constructor(private readonly aiService: AiService) {}

  // Runs every day at 08:00 UAE time (UTC+4 → 04:00 UTC)
  @Cron('0 4 * * *')
  async generateDailyReminders() {
    this.logger.log('Running daily AI reminder generation');
    await this.aiService.generateRemindersForAllPets();
  }

  // Runs daily at 07:00 UAE time (03:00 UTC)
  @Cron('0 3 * * *')
  async sendBirthdayReminders() {
    this.logger.log('Checking pet birthdays...');
    await this.aiService.sendBirthdayPushes();
  }
}
