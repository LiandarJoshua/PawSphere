import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommentDto } from './dto/create-comment.dto';

const COMMENT_INCLUDE = { author: { select: { id: true, email: true, displayName: true, avatarUrl: true } } };

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  list(postId: string) {
    return this.prisma.comment.findMany({
      where: { postId },
      include: COMMENT_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(postId: string, authorId: string, dto: CreateCommentDto) {
    const comment = await this.prisma.comment.create({
      data: { postId, authorId, content: dto.content },
      include: COMMENT_INCLUDE,
    });

    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (post && post.authorId !== authorId) {
      await this.notifications.sendPush(
        [post.authorId],
        'New Comment',
        'Someone commented on your post',
        { postId },
      );
    }

    return comment;
  }

  async remove(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment || comment.authorId !== userId) throw new NotFoundException('Comment not found');
    await this.prisma.comment.delete({ where: { id } });
    return { success: true };
  }
}
