import { Module } from '@nestjs/common';
import { SittersService } from './sitters.service';
import { SittersController } from './sitters.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [SittersService],
  controllers: [SittersController],
})
export class SittersModule {}
