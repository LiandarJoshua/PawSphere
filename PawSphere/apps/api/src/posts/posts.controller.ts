import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('posts')
@ApiBearerAuth()
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @ApiOperation({ summary: 'List community posts, optionally filtered by category' })
  list(@Query('category') category: string | undefined, @CurrentUser() user: User) {
    return this.postsService.list(category as any, user?.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  create(@CurrentUser() user: User, @Body() dto: CreatePostDto) {
    return this.postsService.create(user.id, dto);
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Toggle like on a post (like/unlike)' })
  like(@Param('id') id: string, @CurrentUser() user: User) {
    return this.postsService.like(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete your own post' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.postsService.remove(id, user.id);
  }
}
