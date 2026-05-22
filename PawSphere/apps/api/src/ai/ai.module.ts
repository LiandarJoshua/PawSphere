import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiScheduler } from './ai.scheduler';
import { AiController } from './ai.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [AiService, AiScheduler],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}
