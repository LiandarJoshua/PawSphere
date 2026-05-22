import { api } from '../lib/api';

export const analyticsService = {
  async getWeightTrend(petId: string) {
    return api.get<{ weight: number; loggedAt: string; notes?: string }[]>(
      `/health/pets/${petId}/weight-trend`,
    );
  },
  async getHealthSummary(petId: string) {
    return api.get<{
      vaccinations: number;
      activeMedications: number;
      recentVisits: Array<{ id: string; visitDate: string; reason: string; vetName?: string; cost?: number }>;
      recentWeights: Array<{ weight: number; loggedAt: string }>;
    }>(`/health/pets/${petId}/summary`);
  },
};
