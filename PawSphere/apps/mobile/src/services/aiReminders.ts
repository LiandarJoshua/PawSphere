import { api } from '../lib/api';

export interface AIReminder {
  id: string;
  petId: string;
  userId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  pet: { name: string; species: string };
}

export const aiRemindersService = {
  list: () => api.get<AIReminder[]>('/ai/reminders'),
  generate: () => api.post<void>('/ai/reminders/generate', {}),
  markRead: (id: string) => api.post<void>(`/ai/reminders/${id}/read`, {}),
};
