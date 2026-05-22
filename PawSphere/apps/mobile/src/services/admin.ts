import { api } from '../lib/api';

export const adminService = {
  async getStats() {
    return api.get<{ users: number; pets: number; bookings: number; providers: number; sitters: number; posts: number }>(
      '/admin/stats',
    );
  },
  async listProviders(verified?: boolean) {
    return api.get<any[]>(
      `/admin/providers${verified !== undefined ? `?verified=${verified}` : ''}`,
    );
  },
  async verifyProvider(id: string, isVerified: boolean) {
    return api.patch<any>(`/admin/providers/${id}/verify`, { isVerified });
  },
  async listUsers() {
    return api.get<any[]>('/admin/users');
  },
};
