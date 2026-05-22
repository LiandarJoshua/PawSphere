import { api } from '../lib/api';

export type ServiceType = 'VET' | 'GROOMER' | 'PET_STORE' | 'PET_HOTEL' | 'TRAINER';

export interface Provider {
  id: string;
  serviceType: ServiceType;
  businessName: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  websiteUrl: string | null;
  latitude: number;
  longitude: number;
  rating: number;
  isVerified: boolean;
  distance_km?: number;
}

export interface TimeSlot {
  id: string;
  providerId: string;
  startsAt: string;
  durationMin: number;
  price: number | null;
  label: string | null;
  isBooked: boolean;
}

export interface AppointmentBooking {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  scheduledAt: string;
  totalPrice: number;
  notes: string | null;
  provider: { id: string; businessName: string; serviceType: ServiceType; address: string | null };
  pet: { id: string; name: string; species: string };
  timeSlot: { startsAt: string; durationMin: number; label: string | null } | null;
}

export const providersService = {
  nearby: (lat: number, lng: number, radius = 20, type?: ServiceType) => {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      radius: radius.toString(),
      ...(type ? { type } : {}),
    });
    return api.get<Provider[]>(`/services/nearby?${params}`);
  },
  getSlots: (providerId: string, date: string) =>
    api.get<TimeSlot[]>(`/services/${providerId}/slots?date=${date}`),
  generateDemoSlots: (providerId: string) =>
    api.post<{ created: number }>(`/services/${providerId}/slots/generate-demo`, {}),
};

export const bookingsService = {
  list: () => api.get<AppointmentBooking[]>('/bookings'),
  create: (payload: {
    providerId: string;
    petId: string;
    timeSlotId?: string;
    scheduledAt: string;
    totalPrice: number;
    notes?: string;
  }) => api.post<AppointmentBooking>('/bookings', payload),
  cancel: (id: string) => api.delete<AppointmentBooking>(`/bookings/${id}`),
};
