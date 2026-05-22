import { api } from '../lib/api';

export interface Comment {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  author: { id: string; email: string; displayName?: string | null };
}

export const commentsService = {
  list: (postId: string) => api.get<Comment[]>(`/posts/${postId}/comments`),
  create: (postId: string, content: string) =>
    api.post<Comment>(`/posts/${postId}/comments`, { content }),
  delete: (commentId: string) => api.delete<{ success: boolean }>(`/comments/${commentId}`),
};
