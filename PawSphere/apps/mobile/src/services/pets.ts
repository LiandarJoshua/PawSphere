import { api } from '../lib/api';

export type Species = 'DOG' | 'CAT' | 'BIRD' | 'RABBIT' | 'REPTILE' | 'FISH' | 'OTHER';

export interface Pet {
  id: string;
  householdId: string;
  name: string;
  species: Species;
  breed: string | null;
  dob: string | null;
  avatarUrl: string | null;
  medicalInfo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Vaccination {
  id: string;
  petId: string;
  vaccineName: string;
  administeredAt: string;
  nextDueDate: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreatePetPayload {
  name: string;
  species?: Species;
  breed?: string;
  dob?: string;
  avatarUrl?: string;
  medicalInfo?: string;
}

export interface CreateVaccinationPayload {
  vaccineName: string;
  administeredAt: string;
  nextDueDate?: string;
  notes?: string;
}

export const petsService = {
  list: () => api.get<Pet[]>('/pets'),
  get: (id: string) => api.get<Pet>(`/pets/${id}`),
  create: (payload: CreatePetPayload) => api.post<Pet>('/pets', payload),
  update: (id: string, payload: Partial<CreatePetPayload>) =>
    api.patch<Pet>(`/pets/${id}`, payload),
  remove: (id: string) => api.delete<{ deleted: boolean }>(`/pets/${id}`),
  listVaccinations: (petId: string) => api.get<Vaccination[]>(`/pets/${petId}/vaccinations`),
  addVaccination: (petId: string, payload: CreateVaccinationPayload) =>
    api.post<Vaccination>(`/pets/${petId}/vaccinations`, payload),
};
