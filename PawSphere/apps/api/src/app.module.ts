import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PetsModule } from './pets/pets.module';
import { ServicesModule } from './services/services.module';
import { BookingsModule } from './bookings/bookings.module';
import { AlertsModule } from './alerts/alerts.module';
import { AiModule } from './ai/ai.module';
import { MessagesModule } from './messages/messages.module';
import { PlacesModule } from './places/places.module';
import { SittersModule } from './sitters/sitters.module';
import { PostsModule } from './posts/posts.module';
import { CommentsModule } from './comments/comments.module';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UsersModule } from './users/users.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AdminModule } from './admin/admin.module';
import { DmModule } from './dm/dm.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    PrismaModule,
    SupabaseModule,
    AuthModule,
    PetsModule,
    ServicesModule,
    BookingsModule,
    AlertsModule,
    AiModule,
    MessagesModule,
    PlacesModule,
    SittersModule,
    PostsModule,
    CommentsModule,
    HealthModule,
    NotificationsModule,
    UsersModule,
    ReviewsModule,
    AdminModule,
    DmModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
