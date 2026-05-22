import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthService } from './auth.service';

function extractBearerToken(req: Request): string | null {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7);
}

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
  constructor(private readonly authService: AuthService) {
    super({
      // passport-jwt requires a secretOrKey even when we validate the token
      // ourselves via Supabase — use a dummy value and set ignoreExpiration
      // so the library never rejects on its own; our authService.getUser()
      // call is the real gate.
      jwtFromRequest: extractBearerToken,
      ignoreExpiration: true,
      secretOrKey: 'supabase-validates-this',
      passReqToCallback: true,
    });
  }

  async validate(req: Request): Promise<unknown> {
    const token = extractBearerToken(req);
    if (!token) throw new UnauthorizedException('No bearer token provided.');
    return this.authService.getUser(token);
  }
}
