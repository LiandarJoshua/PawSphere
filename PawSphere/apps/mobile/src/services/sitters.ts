import { api } from '../lib/api';

export interface SitterProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  experience: number;
  hourlyRate: number;
  dailyRate: number | null;
  phone: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  isAvailable: boolean;
  rating: number;
  reviewCount: number;
  specialties: string[];
  user: { id: string; email: string };
  reviews: SitterReview[];
}

export interface SitterReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: { id: string; email: string };
}

export interface SitterBooking {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  totalPrice: number;
  notes: string | null;
  sitter: { displayName: string; phone: string | null; city: string | null; rating: number };
  pet: { name: string; species: string };
}

function buildQuery(params?: Record<string, any>): string {
  if (!params) return '';
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return q ? `?${q}` : '';
}

export const sittersService = {
  list: (params?: { city?: string; available?: boolean; specialty?: string }) =>
    api.get<SitterProfile[]>(`/sitters${buildQuery(params)}`),

  getById: (id: string) =>
    api.get<SitterProfile>(`/sitters/${id}`),

  getMyProfile: () =>
    api.get<SitterProfile | null>('/sitters/me/profile'),

  upsertProfile: (data: {
    displayName: string;
    bio?: string;
    experience: number;
    hourlyRate: number;
    dailyRate?: number;
    phone?: string;
    city?: string;
    isAvailable?: boolean;
    specialties?: string[];
  }) => api.post<SitterProfile>('/sitters/me/profile', data),

  bookSitter: (data: {
    sitterId: string;
    petId: string;
    startDate: string;
    endDate: string;
    notes?: string;
  }) => api.post<SitterBooking>('/sitters/bookings', data),

  getMyBookings: () =>
    api.get<SitterBooking[]>('/sitters/me/bookings'),

  getMySitterBookings: () =>
    api.get<any[]>('/sitters/me/sitter-bookings'),

  updateBookingStatus: (bookingId: string, status: string) =>
    api.patch<any>(`/sitters/bookings/${bookingId}/status`, { status }),

  addReview: (data: { sitterId: string; rating: number; comment?: string }) =>
    api.post<any>('/sitters/reviews', data),

  addAvailability: (data: { startDate: string; endDate: string }) =>
    api.post<any>('/sitters/availability', data),

  getAvailability: (sitterId: string) =>
    api.get<Array<{ id: string; sitterId: string; startDate: string; endDate: string; createdAt: string }>>(
      `/sitters/${sitterId}/availability`,
    ),

  removeAvailability: (availId: string) =>
    api.delete<any>(`/sitters/availability/${availId}`),
};

export const SPECIALTIES = [
  { key: 'DOG', label: 'Dogs', emoji: '🐕' },
  { key: 'CAT', label: 'Cats', emoji: '🐈' },
  { key: 'BIRD', label: 'Birds', emoji: '🦜' },
  { key: 'SMALL_ANIMAL', label: 'Small Animals', emoji: '🐹' },
  { key: 'REPTILE', label: 'Reptiles', emoji: '🦎' },
];
