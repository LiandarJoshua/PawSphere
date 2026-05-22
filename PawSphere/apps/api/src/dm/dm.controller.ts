import {
  Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { DmService } from './dm.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('dm')
@ApiBearerAuth()
@Controller('dm')
export class DmController {
  constructor(private readonly dmService: DmService) {}

  @Get('conversations')
  getConversations(@CurrentUser() user: User) {
    return this.dmService.getConversations(user.id);
  }

  @Get(':userId/messages')
  getMessages(@CurrentUser() user: User, @Param('userId') userId: string) {
    return this.dmService.getMessages(user.id, userId);
  }

  @Post(':userId/send')
  send(
    @CurrentUser() user: User,
    @Param('userId') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.dmService.send(user.id, userId, dto.content);
  }

  @Delete(':userId/conversation')
  @HttpCode(HttpStatus.OK)
  deleteConversation(@CurrentUser() user: User, @Param('userId') userId: string) {
    return this.dmService.deleteConversation(user.id, userId);
  }
}
