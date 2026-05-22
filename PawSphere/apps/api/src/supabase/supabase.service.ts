import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const ws = require('ws') as any;

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;

  constructor(private config: ConfigService) {
    const url = this.config.getOrThrow<string>('SUPABASE_URL');
    const key = this.config.getOrThrow<string>('SUPABASE_ANON_KEY');
    this.client = createClient(url, key, {
      auth: { persistSession: false },
      realtime: { transport: ws },
    });
  }

  get admin(): SupabaseClient {
    return this.client;
  }

  clientWithToken(accessToken: string): SupabaseClient {
    const url = this.config.getOrThrow<string>('SUPABASE_URL');
    const key = this.config.getOrThrow<string>('SUPABASE_ANON_KEY');
    return createClient(url, key, {
      auth: { persistSession: false },
      realtime: { transport: ws },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
  }
}
