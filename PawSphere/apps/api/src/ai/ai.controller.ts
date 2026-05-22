import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('reminders')
  @ApiOperation({ summary: 'Get AI-generated reminders for the current user' })
  getReminders(@CurrentUser() user: User) {
    return this.aiService.getRemindersForUser(user.id);
  }

  @Post('reminders/generate')
  @ApiOperation({ summary: 'Manually trigger reminder generation for current user' })
  generate(@CurrentUser() user: User) {
    return this.aiService.generateRemindersForUser(user.id);
  }

  @Post('reminders/:id/read')
  @ApiOperation({ summary: 'Mark a reminder as read' })
  markRead(@CurrentUser() user: User, @Param('id') id: string) {
    return this.aiService.markRead(id, user.id);
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat with PawBot AI assistant' })
  async chat(
    @CurrentUser() user: User,
    @Body() body: { messages: { role: 'user' | 'model'; text: string }[] },
  ) {
    const reply = await this.aiService.chat(user.id, body.messages);
    return { reply };
  }
}
