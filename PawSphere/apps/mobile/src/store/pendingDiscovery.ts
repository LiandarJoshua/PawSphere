import { create } from 'zustand';
import type { PlaceResult, PlaceDetail } from '../services/places';
import type { Provider } from '../services/providers';

export interface PrefilledDetail {
  phone: string | null;
  website: string | null;
  aiDescription: string | null;
  extraPhotoRefs: string[];
  reviews: PlaceDetail['reviews'];
}

interface PendingDiscoveryState {
  pendingPlace: PlaceResult | null;
  prefilledDetail: PrefilledDetail | null;
  setPendingDiscoveryPlace: (place: PlaceResult, detail?: PrefilledDetail) => void;
  clearPendingDiscoveryPlace: () => void;
}

export const usePendingDiscoveryStore = create<PendingDiscoveryState>((set) => ({
  pendingPlace: null,
  prefilledDetail: null,
  setPendingDiscoveryPlace: (place, detail) =>
    set({ pendingPlace: place, prefilledDetail: detail ?? null }),
  clearPendingDiscoveryPlace: () =>
    set({ pendingPlace: null, prefilledDetail: null }),
}));

export function setPendingDiscoveryPlace(place: PlaceResult, detail?: PrefilledDetail): void {
  usePendingDiscoveryStore.getState().setPendingDiscoveryPlace(place, detail);
}

/** Convert a registered Provider to a PlaceResult + PrefilledDetail pair. */
export function providerToDiscovery(provider: Provider): {
  place: PlaceResult;
  detail: PrefilledDetail;
} {
  const place: PlaceResult = {
    id: provider.id,
    name: provider.businessName,
    address: provider.address ?? '',
    lat: provider.latitude,
    lng: provider.longitude,
    rating: provider.rating || null,
    reviewCount: null,
    photoRef: null,
    serviceType: provider.serviceType,
    distanceKm: provider.distance_km ?? 0,
    isOpen: null,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${provider.latitude},${provider.longitude}`,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${provider.latitude},${provider.longitude}`,
  };
  const detail: PrefilledDetail = {
    phone: provider.phone,
    website: provider.websiteUrl,
    aiDescription: provider.description,
    extraPhotoRefs: [],
    reviews: [],
  };
  return { place, detail };
}
