import { api } from '../lib/api';

export interface ProviderReview {
  id: string;
  providerId: string;
  reviewerId: string;
  bookingId?: string | null;
  rating: number;
  comment?: string | null;
  createdAt: string;
  reviewer: { id: string; email: string; displayName?: string | null; avatarUrl?: string | null };
}

export const reviewsService = {
  async addProviderReview(data: { providerId: string; bookingId?: string; rating: number; comment?: string }) {
    return api.post<ProviderReview>(`/providers/${data.providerId}/reviews`, data);
  },
  async getProviderReviews(providerId: string) {
    return api.get<ProviderReview[]>(`/providers/${providerId}/reviews`);
  },
};
