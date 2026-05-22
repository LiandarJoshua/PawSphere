import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// AbortSignal.timeout() requires ES2022+ — use this helper for ES2021 compat
function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function roundKm(km: number) {
  return Math.round(km * 10) / 10;
}

function inferServiceType(types: string[], name: string): string {
  if (types.includes('veterinary_care')) return 'VET';
  if (types.includes('pet_store')) return 'PET_STORE';
  const n = name.toLowerCase();
  if (n.includes('groom') || n.includes('spa') && (n.includes('pet') || n.includes('dog') || n.includes('cat'))) return 'GROOMER';
  if (n.includes('kennel') || n.includes('board') || n.includes('lodge') || (n.includes('hotel') && (n.includes('pet') || n.includes('dog') || n.includes('cat')))) return 'KENNEL';
  if (n.includes('train')) return 'TRAINER';
  return 'VET';
}

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

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);
  readonly apiKey: string | null;
  private readonly cache = new Map<string, { data: PlaceResult[]; exp: number }>();

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('GOOGLE_PLACES_API_KEY') ?? null;
    if (!this.apiKey) {
      this.logger.warn('GOOGLE_PLACES_API_KEY not set — using OpenStreetMap Overpass fallback (no ratings/photos)');
    }
  }

  async findNearby(lat: number, lng: number, radiusKm: number, type?: string): Promise<PlaceResult[]> {
    const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)},${radiusKm},${type ?? 'all'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.exp > Date.now()) return cached.data;

    const results = this.apiKey
      ? await this.googleNearby(lat, lng, radiusKm * 1000, type)
      : await this.overpassNearby(lat, lng, radiusKm, type);

    this.cache.set(cacheKey, { data: results, exp: Date.now() + 5 * 60_000 });
    return results;
  }

  private async googleNearby(lat: number, lng: number, radiusM: number, type?: string): Promise<PlaceResult[]> {
    const searches: Array<Promise<PlaceResult[]>> = [];

    if (type) {
      if (type === 'VET') searches.push(this.googleSearch(lat, lng, radiusM, undefined, 'veterinary_care'));
      if (type === 'PET_STORE') searches.push(this.googleSearch(lat, lng, radiusM, undefined, 'pet_store'));
      if (type === 'GROOMER') {
        // Use keyword only — no beauty_salon type which pulls in barber shops
        searches.push(this.googleSearch(lat, lng, radiusM, 'pet grooming'));
        searches.push(this.googleSearch(lat, lng, radiusM, 'dog grooming'));
      }
      if (type === 'KENNEL') {
        searches.push(this.googleSearch(lat, lng, radiusM, 'pet boarding kennel'));
        searches.push(this.googleSearch(lat, lng, radiusM, 'dog kennel'));
        searches.push(this.googleSearch(lat, lng, radiusM, 'cat boarding'));
      }
      if (type === 'TRAINER') searches.push(this.googleSearch(lat, lng, radiusM, 'dog training'));
    } else {
      searches.push(this.googleSearch(lat, lng, radiusM, undefined, 'veterinary_care'));
      searches.push(this.googleSearch(lat, lng, radiusM, undefined, 'pet_store'));
      searches.push(this.googleSearch(lat, lng, radiusM, 'pet grooming'));
      searches.push(this.googleSearch(lat, lng, radiusM, 'pet boarding kennel'));
    }

    const settled = await Promise.allSettled(searches);
    const seen = new Set<string>();
    const merged: PlaceResult[] = [];

    for (const r of settled) {
      if (r.status === 'fulfilled') {
        for (const place of r.value) {
          if (!seen.has(place.id)) { seen.add(place.id); merged.push(place); }
        }
      }
    }

    return merged.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  private async googleSearch(lat: number, lng: number, radiusM: number, keyword?: string, type?: string): Promise<PlaceResult[]> {
    const params = new URLSearchParams({ location: `${lat},${lng}`, radius: String(radiusM), key: this.apiKey! });
    if (keyword) params.set('keyword', keyword);
    if (type) params.set('type', type);

    try {
      const res = await fetchWithTimeout(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`,
        {},
        8000,
      );
      const json = (await res.json()) as any;

      if (!['OK', 'ZERO_RESULTS'].includes(json.status)) {
        this.logger.warn(`Places API ${json.status}: ${json.error_message ?? ''}`);
        return [];
      }

      return (json.results ?? []).map((p: any) => this.mapGoogleResult(p, lat, lng));
    } catch (err) {
      this.logger.error(`googleSearch error: ${err}`);
      return [];
    }
  }

  private mapGoogleResult(p: any, userLat: number, userLng: number): PlaceResult {
    const pLat = p.geometry.location.lat as number;
    const pLng = p.geometry.location.lng as number;
    return {
      id: p.place_id as string,
      name: p.name as string,
      address: (p.vicinity ?? '') as string,
      lat: pLat,
      lng: pLng,
      rating: p.rating ?? null,
      reviewCount: p.user_ratings_total ?? null,
      photoRef: p.photos?.[0]?.photo_reference ?? null,
      serviceType: inferServiceType(p.types ?? [], p.name),
      distanceKm: roundKm(haversineKm(userLat, userLng, pLat, pLng)),
      isOpen: p.opening_hours?.open_now ?? null,
      directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${pLat},${pLng}&destination_place_id=${p.place_id}`,
      mapsUrl: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
    };
  }

  async getDetail(placeId: string, userLat: number, userLng: number): Promise<PlaceDetail> {
    if (!this.apiKey) throw new Error('Google Places API key required for place details');

    const params = new URLSearchParams({
      place_id: placeId,
      fields: 'name,vicinity,rating,user_ratings_total,photos,geometry,formatted_phone_number,website,opening_hours,reviews,types',
      key: this.apiKey,
    });

    const res = await fetchWithTimeout(
      `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
      {},
      10000,
    );
    const json = (await res.json()) as any;
    if (json.status !== 'OK') throw new Error(`Place details: ${json.status}`);

    const p = json.result;
    const base = this.mapGoogleResult({ ...p, place_id: placeId }, userLat, userLng);

    return {
      ...base,
      phone: p.formatted_phone_number ?? null,
      website: p.website ?? null,
      extraPhotoRefs: (p.photos ?? []).slice(0, 5).map((ph: any) => ph.photo_reference as string),
      reviews: (p.reviews ?? []).slice(0, 5).map((r: any) => ({
        author: r.author_name as string,
        rating: r.rating as number,
        text: r.text as string,
        time: r.time as number,
      })),
    };
  }

  async fetchPhoto(ref: string): Promise<{ buffer: Buffer; contentType: string }> {
    if (!this.apiKey) throw new Error('No API key');
    const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${encodeURIComponent(ref)}&key=${this.apiKey}`;
    const res = await fetchWithTimeout(url, {}, 10000);
    return { buffer: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get('content-type') ?? 'image/jpeg' };
  }

  private async overpassNearby(lat: number, lng: number, radiusKm: number, type?: string): Promise<PlaceResult[]> {
    const r = radiusKm * 1000;
    const base = `around:${r},${lat},${lng}`;

    const vetNodes = `node["amenity"="veterinary"](${base});way["amenity"="veterinary"](${base});`;
    const petNodes = `node["shop"="pet"](${base});way["shop"="pet"](${base});`;
    const groomNodes = `node["shop"="groomer"](${base});way["shop"="groomer"](${base});`;
    const kennelNodes = `node["amenity"="animal_boarding"](${base});way["amenity"="animal_boarding"](${base});node["boarding"="yes"](${base});`;

    const inner =
      type === 'VET' ? vetNodes
      : type === 'PET_STORE' ? petNodes
      : type === 'GROOMER' ? groomNodes
      : type === 'KENNEL' ? kennelNodes
      : vetNodes + petNodes + groomNodes + kennelNodes;

    const query = `[out:json][timeout:25];(${inner});out center;`;

    try {
      const res = await fetchWithTimeout(
        'https://overpass-api.de/api/interpreter',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
        },
        30000,
      );
      const json = (await res.json()) as any;

      return (json.elements ?? [])
        .filter((el: any) => el.tags?.name)
        .map((el: any) => {
          const eLat = (el.lat ?? el.center?.lat) as number;
          const eLng = (el.lon ?? el.center?.lon) as number;
          const tags = el.tags as Record<string, string>;
          let serviceType = 'VET';
          if (tags.shop === 'pet') serviceType = 'PET_STORE';
          else if (tags.shop === 'groomer') serviceType = 'GROOMER';
          else if (tags.amenity === 'animal_boarding' || tags.boarding === 'yes') serviceType = 'KENNEL';

          return {
            id: `osm-${el.id}`,
            name: tags.name,
            address: [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ') || tags.name,
            lat: eLat,
            lng: eLng,
            rating: null,
            reviewCount: null,
            photoRef: null,
            serviceType,
            distanceKm: roundKm(haversineKm(lat, lng, eLat, eLng)),
            isOpen: null,
            directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${eLat},${eLng}`,
            mapsUrl: `https://www.google.com/maps/search/?api=1&query=${eLat},${eLng}`,
          } as PlaceResult;
        })
        .sort((a: PlaceResult, b: PlaceResult) => a.distanceKm - b.distanceKm);
    } catch (err) {
      this.logger.error(`Overpass error: ${err}`);
      return [];
    }
  }
}
