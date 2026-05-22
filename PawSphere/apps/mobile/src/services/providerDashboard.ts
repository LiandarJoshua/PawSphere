import { api } from '../lib/api';

export const providerDashboardService = {
  async getMyBookings() {
    return api.get<any[]>('/services/my/bookings');
  },
  async getMyEarnings() {
    return api.get<{ total: number }>('/services/my/earnings');
  },
  async getMyTimeslots() {
    return api.get<any[]>('/services/my/timeslots');
  },
  async createTimeslot(data: { startsAt: string; durationMin: number; price: number; label?: string }) {
    return api.post<any>('/services/timeslots', data);
  },
};
