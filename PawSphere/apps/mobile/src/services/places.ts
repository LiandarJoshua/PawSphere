import { api } from '../lib/api';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  reviewCount: number | null;
  photoRef: string | null;
  serviceType: string;
  distanceKm: number;
  isOpen: boolean | null;
  directionsUrl: string;
  mapsUrl: string;
}

export interface PlaceDetail extends PlaceResult {
  phone: string | null;
  website: string | null;
  extraPhotoRefs: string[];
  reviews: Array<{ author: string; rating: number; text: string; time: number }>;
}

export function getPhotoUrl(ref: string, maxWidth = 400): string {
  return `${API_BASE}/places/photo?ref=${encodeURIComponent(ref)}&w=${maxWidth}`;
}

export const placesService = {
  nearby: (lat: number, lng: number, radius = 10, type?: string) =>
    api.get<PlaceResult[]>(
      `/places/nearby?lat=${lat}&lng=${lng}&radius=${radius}${type ? `&type=${type}` : ''}`,
    ),

  getDetail: (placeId: string, lat: number, lng: number) =>
    api.get<PlaceDetail>(
      `/places/${encodeURIComponent(placeId)}/detail?lat=${lat}&lng=${lng}`,
    ),

  getAiDescription: (placeId: string, name: string, type: string, rating: number | null, reviewCount: number | null, address: string) =>
    api.get<{ description: string }>(
      `/places/${encodeURIComponent(placeId)}/ai-description?name=${encodeURIComponent(name)}&type=${type}&rating=${rating ?? ''}&reviews=${reviewCount ?? ''}&address=${encodeURIComponent(address)}`,
    ),
};
