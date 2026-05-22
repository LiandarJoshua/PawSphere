import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Language } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly prisma: PrismaService,
  ) {}

  async register(dto: RegisterDto) {
    const { data, error } = await this.supabase.admin.auth.signUp({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        throw new ConflictException('An account with this email already exists.');
      }
      throw new InternalServerErrorException(error.message);
    }

    if (!data.user) {
      throw new InternalServerErrorException('Registration failed — no user returned.');
    }

    // Mirror the Supabase auth user into our own users table
    const user = await this.prisma.user.upsert({
      where: { id: data.user.id },
      update: {},
      create: {
        id: data.user.id,
        email: dto.email,
        phone: dto.phone ?? null,
        language: (dto.language as Language) ?? Language.en,
      },
    });

    return {
      user,
      session: data.session,
    };
  }

  async login(dto: LoginDto) {
    const { data, error } = await this.supabase.admin.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: data.user.id },
    });

    return {
      user,
      session: data.session,
    };
  }

  async getUser(accessToken: string) {
    const { data, error } = await this.supabase.admin.auth.getUser(accessToken);

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    try {
      const meta = data.user.user_metadata ?? {};
      const displayName: string | null = meta.display_name ?? meta.full_name ?? null;
      const avatarUrl: string | null = meta.avatar_url ?? null;

      return await this.prisma.user.upsert({
        where: { id: data.user.id },
        update: { displayName, avatarUrl },
        create: {
          id: data.user.id,
          email: data.user.email!,
          phone: data.user.phone ?? null,
          language: Language.en,
          displayName,
          avatarUrl,
        },
      });
    } catch (e: any) {
      // P2002 = unique constraint — race condition when multiple requests fire simultaneously
      if (e?.code === 'P2002') {
        return this.prisma.user.findUniqueOrThrow({ where: { id: data.user.id } });
      }
      throw e;
    }
  }
}
