import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  isPublic: true,
  createdAt: true,
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, requesterId: string) {
    const term = q.trim();
    if (!term) return [];
    return this.prisma.user.findMany({
      where: {
        isPublic: true,
        id: { not: requesterId },
        OR: [
          { displayName: { contains: term, mode: 'insensitive' } },
          { email: { startsWith: term, mode: 'insensitive' } },
        ],
      },
      select: PUBLIC_USER_SELECT,
      take: 20,
    });
  }

  async getProfile(targetId: string, requesterId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: {
        ...PUBLIC_USER_SELECT,
        _count: { select: { posts: true, followers: true, following: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.isPublic && user.id !== requesterId) throw new ForbiddenException('This profile is private');

    const isFollowing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: requesterId, followingId: targetId } },
    });

    return { ...user, isFollowing: !!isFollowing };
  }

  async getUserPosts(targetId: string, requesterId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetId }, select: { isPublic: true } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.isPublic && targetId !== requesterId) throw new ForbiddenException('This profile is private');

    return this.prisma.post.findMany({
      where: { authorId: targetId },
      include: { author: { select: { id: true, email: true, displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) throw new ForbiddenException('Cannot follow yourself');
    const target = await this.prisma.user.findUnique({ where: { id: followingId } });
    if (!target) throw new NotFoundException('User not found');
    try {
      await this.prisma.follow.create({ data: { followerId, followingId } });
    } catch {
      throw new ConflictException('Already following this user');
    }
    return { success: true };
  }

  async unfollow(followerId: string, followingId: string) {
    await this.prisma.follow.deleteMany({ where: { followerId, followingId } });
    return { success: true };
  }

  async updateProfile(userId: string, bio?: string, isPublic?: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(bio !== undefined && { bio }),
        ...(isPublic !== undefined && { isPublic }),
      },
      select: PUBLIC_USER_SELECT,
    });
  }
}
