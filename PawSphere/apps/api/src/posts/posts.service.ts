import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PostCategory } from '@prisma/client';

const POST_INCLUDE = {
  author: { select: { id: true, email: true, displayName: true, avatarUrl: true, isPublic: true } },
};

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(category?: PostCategory, userId?: string) {
    const posts = await this.prisma.post.findMany({
      where: category ? { category } : undefined,
      include: {
        ...POST_INCLUDE,
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    let likedIds = new Set<string>();
    if (userId) {
      const likes = await this.prisma.postLike.findMany({
        where: { userId, postId: { in: posts.map((p) => p.id) } },
        select: { postId: true },
      });
      likedIds = new Set(likes.map((l) => l.postId));
    }

    return posts.map((p) => ({
      ...p,
      commentCount: p._count.comments,
      isLiked: likedIds.has(p.id),
    }));
  }

  async create(authorId: string, dto: CreatePostDto) {
    const post = await this.prisma.post.create({
      data: {
        authorId,
        category: dto.category,
        content: dto.content,
        petName: dto.petName,
        location: dto.location,
        contactInfo: dto.contactInfo,
        itemName: dto.itemName,
        price: dto.price,
        imageUrls: dto.imageUrls ?? [],
      },
      include: {
        ...POST_INCLUDE,
        _count: { select: { comments: true } },
      },
    });
    return { ...post, commentCount: post._count.comments, isLiked: false };
  }

  async like(id: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId: id, userId } },
    });

    if (existing) {
      // Already liked — unlike it
      await this.prisma.postLike.delete({
        where: { postId_userId: { postId: id, userId } },
      });
      const updated = await this.prisma.post.update({
        where: { id },
        data: { likes: { decrement: 1 } },
        include: { ...POST_INCLUDE, _count: { select: { comments: true } } },
      });
      return { ...updated, commentCount: updated._count.comments, isLiked: false };
    } else {
      // Not liked — like it
      await this.prisma.postLike.create({ data: { postId: id, userId } });
      const updated = await this.prisma.post.update({
        where: { id },
        data: { likes: { increment: 1 } },
        include: { ...POST_INCLUDE, _count: { select: { comments: true } } },
      });
      return { ...updated, commentCount: updated._count.comments, isLiked: true };
    }
  }

  async remove(id: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new NotFoundException('Post not found');
    await this.prisma.post.delete({ where: { id } });
    return { success: true };
  }
}
