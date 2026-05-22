import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { PrismaService } from '../prisma/prisma.service';

const mockSupabaseAuth = {
  signUp: jest.fn(),
  signInWithPassword: jest.fn(),
  getUser: jest.fn(),
};

const mockSupabaseService = {
  admin: { auth: mockSupabaseAuth },
};

const mockUser = {
  id: 'uuid-123',
  email: 'test@pawsphere.ae',
  phone: null,
  role: 'OWNER',
  language: 'en',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrismaService = {
  user: {
    upsert: jest.fn().mockResolvedValue(mockUser),
    findUnique: jest.fn().mockResolvedValue(mockUser),
  },
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ─── register ────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates a user and returns session on success', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: { id: 'uuid-123' }, session: { access_token: 'tok' } },
        error: null,
      });
      mockPrismaService.user.upsert.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'test@pawsphere.ae',
        password: 'password123',
      });

      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
        email: 'test@pawsphere.ae',
        password: 'password123',
      });
      expect(mockPrismaService.user.upsert).toHaveBeenCalled();
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual({ access_token: 'tok' });
    });

    it('throws ConflictException when email already registered', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      await expect(
        service.register({ email: 'test@pawsphere.ae', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws InternalServerErrorException on unknown Supabase error', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Something went wrong' },
      });

      await expect(
        service.register({ email: 'test@pawsphere.ae', password: 'password123' }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('throws InternalServerErrorException when no user is returned', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      await expect(
        service.register({ email: 'test@pawsphere.ae', password: 'password123' }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ─── login ───────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns user and session on valid credentials', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'uuid-123' }, session: { access_token: 'tok' } },
        error: null,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.login({
        email: 'test@pawsphere.ae',
        password: 'password123',
      });

      expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@pawsphere.ae',
        password: 'password123',
      });
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual({ access_token: 'tok' });
    });

    it('throws UnauthorizedException on invalid credentials', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      await expect(
        service.login({ email: 'test@pawsphere.ae', password: 'wrongpass' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── getUser ─────────────────────────────────────────────────────────────────

  describe('getUser', () => {
    it('returns the user for a valid token', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: 'uuid-123' } },
        error: null,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUser('valid-token');

      expect(mockSupabaseAuth.getUser).toHaveBeenCalledWith('valid-token');
      expect(result).toEqual(mockUser);
    });

    it('throws UnauthorizedException for an invalid token', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' },
      });

      await expect(service.getUser('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user not found in DB', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: 'uuid-ghost' } },
        error: null,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUser('valid-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
