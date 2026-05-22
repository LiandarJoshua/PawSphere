import { api } from '../lib/api';

export interface ActivityLog {
  id: string;
  petId: string;
  type: string;
  notes?: string | null;
  durationMin?: number | null;
  amount?: string | null;
  loggedAt: string;
}

export const activityService = {
  async logActivity(petId: string, data: { type: string; notes?: string; durationMin?: number; amount?: string }) {
    return api.post<ActivityLog>(`/health/pets/${petId}/activity`, data);
  },
  async getActivityLogs(petId: string) {
    return api.get<ActivityLog[]>(`/health/pets/${petId}/activity`);
  },
};
