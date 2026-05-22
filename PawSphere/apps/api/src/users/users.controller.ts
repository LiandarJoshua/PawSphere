import {
  Controller, Get, Post, Delete, Patch, Param, Query, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search public users by name or email' })
  search(@Query('q') q: string = '', @CurrentUser() user: User) {
    return this.usersService.search(q, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a public user profile' })
  getProfile(@Param('id') id: string, @CurrentUser() user: User) {
    return this.usersService.getProfile(id, user.id);
  }

  @Get(':id/posts')
  @ApiOperation({ summary: 'Get posts by a user (public profiles only)' })
  getUserPosts(@Param('id') id: string, @CurrentUser() user: User) {
    return this.usersService.getUserPosts(id, user.id);
  }

  @Post(':id/follow')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Follow a user' })
  follow(@Param('id') id: string, @CurrentUser() user: User) {
    return this.usersService.follow(user.id, id);
  }

  @Delete(':id/follow')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfollow a user' })
  unfollow(@Param('id') id: string, @CurrentUser() user: User) {
    return this.usersService.unfollow(user.id, id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update own bio and privacy setting' })
  updateProfile(
    @CurrentUser() user: User,
    @Body() body: { bio?: string; isPublic?: boolean },
  ) {
    return this.usersService.updateProfile(user.id, body.bio, body.isPublic);
  }
}
