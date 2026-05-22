import { api } from '../lib/api';

export interface WeightLog {
  id: string;
  petId: string;
  weight: number;
  notes?: string;
  loggedAt: string;
}

export interface Medication {
  id: string;
  petId: string;
  name: string;
  dosage?: string;
  frequency?: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface VetVisit {
  id: string;
  petId: string;
  visitDate: string;
  reason: string;
  notes?: string;
  vetName?: string;
  nextVisit?: string;
  cost?: number;
  documentUrls?: string[];
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  petId: string;
  type: string;
  notes?: string;
  durationMin?: number;
  amount?: string;
  loggedAt: string;
}

export const healthService = {
  getWeightLogs: (petId: string) => api.get<WeightLog[]>(`/health/pets/${petId}/weight-logs`),
  addWeightLog: (petId: string, weight: number, notes?: string) =>
    api.post<WeightLog>(`/health/pets/${petId}/weight-logs`, { weight, notes }),

  getMedications: (petId: string) => api.get<Medication[]>(`/health/pets/${petId}/medications`),
  addMedication: (
    petId: string,
    data: Omit<Medication, 'id' | 'petId' | 'isActive' | 'createdAt'>,
  ) => api.post<Medication>(`/health/pets/${petId}/medications`, data),
  stopMedication: (petId: string, medicationId: string) =>
    api.patch<Medication>(`/health/pets/${petId}/medications/${medicationId}/stop`, {}),

  getVetVisits: (petId: string) => api.get<VetVisit[]>(`/health/pets/${petId}/vet-visits`),
  addVetVisit: (petId: string, data: Omit<VetVisit, 'id' | 'petId' | 'createdAt'>) =>
    api.post<VetVisit>(`/health/pets/${petId}/vet-visits`, data),

  getWeightTrend: (petId: string) =>
    api.get<{ weight: number; loggedAt: string; notes?: string }[]>(`/health/pets/${petId}/weight-trend`),

  getHealthSummary: (petId: string) =>
    api.get<{
      vaccinations: number;
      activeMedications: number;
      recentVisits: VetVisit[];
      recentWeights: WeightLog[];
    }>(`/health/pets/${petId}/summary`),

  logActivity: (
    petId: string,
    data: { type: string; notes?: string; durationMin?: number; amount?: string },
  ) => api.post<ActivityLog>(`/health/pets/${petId}/activity`, data),

  getActivityLogs: (petId: string) =>
    api.get<ActivityLog[]>(`/health/pets/${petId}/activity`),
};
