import { api } from '../lib/api';

export interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  role: string;
  createdAt: string;
  user: { id: string; email: string; displayName?: string | null; avatarUrl?: string | null };
}

export const householdService = {
  async getMembers() {
    return api.get<HouseholdMember[]>('/households/members');
  },
  async inviteMember(email: string) {
    return api.post<HouseholdMember>('/households/members', { email });
  },
  async removeMember(userId: string) {
    return api.delete<{ success: boolean }>(`/households/members/${userId}`);
  },
};
