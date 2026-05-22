import { api } from '../lib/api';

export interface DMUser {
  id: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface DMMessage {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  userId: string;
  user: DMUser;
  lastMessage: { content: string; createdAt: string; isFromMe: boolean };
  unreadCount: number;
}

export const dmService = {
  getConversations: () => api.get<Conversation[]>('/dm/conversations'),
  getMessages: (userId: string) => api.get<DMMessage[]>(`/dm/${userId}/messages`),
  send: (userId: string, content: string) =>
    api.post<DMMessage>(`/dm/${userId}/send`, { content }),
  deleteConversation: (userId: string) =>
    api.delete<{ success: boolean }>(`/dm/${userId}/conversation`),
};
