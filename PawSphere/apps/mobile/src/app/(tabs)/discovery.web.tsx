import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, Pressable, Image, Platform, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { placesService, getPhotoUrl, type PlaceResult, type PlaceDetail } from '../../services/places';
import { providersService, type Provider } from '../../services/providers';
import { BookingModal } from '../../components/BookingModal';
import { useTheme } from '../../theme/ThemeContext';
import { usePendingDiscoveryStore } from '../../store/pendingDiscovery';

// ─── Leaflet loader ───────────────────────────────────────────────────────────

function loadLeaflet(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') { reject(new Error('SSR')); return; }
    if ((window as any).L) { resolve((window as any).L); return; }
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css'; link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (document.getElementById('leaflet-js')) {
      const t = setInterval(() => { if ((window as any).L) { clearInterval(t); resolve((window as any).L); } }, 50);
      return;
    }
    const script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve((window as any).L);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DUBAI = { lat: 25.2048, lng: 55.2708 };
type Filter = 'ALL' | 'VET' | 'GROOMER' | 'PET_STORE' | 'KENNEL';

const FILTERS: Array<{ key: Filter; label: string; emoji: string }> = [
  { key: 'ALL', label: 'All', emoji: '🐾' },
  { key: 'VET', label: 'Vets', emoji: '🏥' },
  { key: 'GROOMER', label: 'Groomers', emoji: '✂️' },
  { key: 'PET_STORE', label: 'Stores', emoji: '🛍️' },
  { key: 'KENNEL', label: 'Kennels', emoji: '🏡' },
];

const TYPE_EMOJI: Record<string, string> = {
  VET: '🏥', GROOMER: '✂️', PET_STORE: '🛍️', KENNEL: '🏡', PET_HOTEL: '🏡', TRAINER: '🎓',
};

// Light and dark bg tints per service type
const TYPE_LIGHT_BG: Record<string, string> = {
  VET: '#EDF5FF', GROOMER: '#EDE9FE', PET_STORE: '#EDFFF3', KENNEL: '#FFF4E5', PET_HOTEL: '#FFF4E5', TRAINER: '#F5EFFE',
};
const TYPE_DARK_BG: Record<string, string> = {
  VET: '#071528', GROOMER: '#1E1040', PET_STORE: '#061810', KENNEL: '#261800', PET_HOTEL: '#261800', TRAINER: '#1A0D38',
};
const TYPE_ACCENT: Record<string, string> = {
  VET: '#4A9EFF', GROOMER: '#9D7FEA', PET_STORE: '#2EBD54', KENNEL: '#E8900A', PET_HOTEL: '#E8900A', TRAINER: '#9D7FEA',
};
const MARKER_COLOR: Record<string, string> = {
  VET: '#4A9EFF', GROOMER: '#9D7FEA', PET_STORE: '#2EBD54', KENNEL: '#E8900A', PET_HOTEL: '#E8900A', TRAINER: '#9D7FEA',
};

// ─── Leaflet Map ──────────────────────────────────────────────────────────────

const TILE_EN = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_AR = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTR_EN = '© <a href="https://carto.com">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const ATTR_AR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

interface MapProps {
  places: PlaceResult[];
  center: { lat: number; lng: number };
  selectedId: string | null;
  onSelect: (p: PlaceResult) => void;
  mapLang: 'en' | 'ar';
}

function LeafletMap({ places, center, selectedId, onSelect, mapLang }: MapProps) {
  const containerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const userDotRef = useRef<any>(null);
  const userRingRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let destroyed = false;
    loadLeaflet().then((L) => {
      if (destroyed || !containerRef.current) return;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      const map = L.map(containerRef.current, { zoomControl: true }).setView([center.lat, center.lng], 13);
      tileLayerRef.current = L.tileLayer(TILE_EN, { attribution: ATTR_EN, maxZoom: 19 }).addTo(map);

      // Google-style user location dot + accuracy ring
      map.locate({ setView: false, watch: true, enableHighAccuracy: true });
      map.on('locationfound', (e: any) => {
        if (destroyed) return;
        const latlng = e.latlng;
        const accuracy = e.accuracy; // metres

        if (userRingRef.current) {
          userRingRef.current.setLatLng(latlng).setRadius(accuracy);
        } else {
          userRingRef.current = L.circle(latlng, {
            radius: accuracy,
            color: '#4285F4',
            weight: 1,
            fillColor: '#4285F4',
            fillOpacity: 0.1,
          }).addTo(map);
        }

        if (userDotRef.current) {
          userDotRef.current.setLatLng(latlng);
        } else {
          const dotIcon = L.divIcon({
            html: `<div style="
              width:16px;height:16px;background:#4285F4;border-radius:50%;
              border:3px solid #FFFFFF;
              box-shadow:0 1px 6px rgba(0,0,0,0.4);
            "></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
            className: '',
          });
          userDotRef.current = L.marker(latlng, { icon: dotIcon, zIndexOffset: 1000 }).addTo(map);
        }
      });

      mapRef.current = map;
    });
    return () => {
      destroyed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
      userDotRef.current = null;
      userRingRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Swap tile layer when language changes
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    loadLeaflet().then((L) => {
      if (!mapRef.current) return;
      tileLayerRef.current.remove();
      tileLayerRef.current = L.tileLayer(
        mapLang === 'en' ? TILE_EN : TILE_AR,
        { attribution: mapLang === 'en' ? ATTR_EN : ATTR_AR, maxZoom: 19 },
      ).addTo(mapRef.current);
    });
  }, [mapLang]);

  useEffect(() => {
    mapRef.current?.setView([center.lat, center.lng], 13, { animate: true });
  }, [center.lat, center.lng]);

  useEffect(() => {
    if (!mapRef.current) return;
    const timer = setTimeout(() => {
      loadLeaflet().then((L) => {
        if (!mapRef.current) return;
        markersRef.current.forEach((m) => m.remove());
        markersRef.current.clear();
        places.forEach((p) => {
          const isSelected = p.id === selectedId;
          const emoji = TYPE_EMOJI[p.serviceType] ?? '🐾';
          const bg = isSelected ? '#9D7FEA' : (MARKER_COLOR[p.serviceType] ?? '#666');
          const size = isSelected ? 44 : 36;
          const fontSize = isSelected ? 20 : 16;
          const icon = L.divIcon({
            html: `<div style="background:${bg};border-radius:50%;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;box-shadow:0 2px 10px rgba(0,0,0,0.35);border:2px solid rgba(255,255,255,0.3);cursor:pointer;transition:all 0.2s;">${emoji}</div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
            className: '',
          });
          const marker = L.marker([p.lat, p.lng], { icon }).addTo(mapRef.current).on('click', () => onSelect(p));
          markersRef.current.set(p.id, marker);
        });
        if (selectedId) {
          const sel = places.find((p) => p.id === selectedId);
          if (sel) mapRef.current.panTo([sel.lat, sel.lng], { animate: true });
        }
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [places, selectedId]);

  return React.createElement('div', { ref: containerRef, style: { width: '100%', height: '100%' } });
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <Text style={{ fontSize: 13, color: '#E8900A' }}>
      {'★'.repeat(full)}{half ? '⯨' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
    </Text>
  );
}

// ─── Place Card ───────────────────────────────────────────────────────────────

function PlaceCard({ place, selected, onPress }: { place: PlaceResult; selected: boolean; onPress: () => void }) {
  const { colors, isDark } = useTheme();
  const photoUrl = place.photoRef ? getPhotoUrl(place.photoRef, 200) : null;
  const accent = TYPE_ACCENT[place.serviceType] ?? colors.textSecondary;
  const typeBg = isDark ? (TYPE_DARK_BG[place.serviceType] ?? colors.surface2) : (TYPE_LIGHT_BG[place.serviceType] ?? colors.surface2);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: selected ? colors.primaryBorder : 'transparent' },
        selected && { borderWidth: 1.5 },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.cardPhoto, { backgroundColor: typeBg }]}>
        {photoUrl
          ? <Image source={{ uri: photoUrl }} style={styles.cardPhotoImg} resizeMode="cover" />
          : <Text style={{ fontSize: 28 }}>{TYPE_EMOJI[place.serviceType] ?? '🐾'}</Text>}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={[styles.typeBadge, { backgroundColor: typeBg }]}>
            <Text style={[styles.typeBadgeText, { color: accent }]}>
              {TYPE_EMOJI[place.serviceType]} {place.serviceType?.replace('_', ' ')}
            </Text>
          </View>
          {place.isOpen !== null && (
            <Text style={[styles.openTag, { color: place.isOpen ? colors.green : colors.red }]}>
              {place.isOpen ? '● Open' : '● Closed'}
            </Text>
          )}
        </View>
        <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{place.name}</Text>
        {place.rating !== null && (
          <View style={styles.ratingRow}>
            <StarRating rating={place.rating} />
            <Text style={[styles.ratingNum, { color: colors.text }]}> {place.rating.toFixed(1)}</Text>
            {place.reviewCount && <Text style={[styles.reviewCount, { color: colors.textTertiary }]}> ({place.reviewCount.toLocaleString()})</Text>}
          </View>
        )}
        <Text style={[styles.cardMeta, { color: colors.textSecondary }]} numberOfLines={1}>📍 {place.address || '—'}</Text>
        <Text style={[styles.cardDist, { color: colors.textTertiary }]}>{place.distanceKm} km away</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  place, detail, aiDescription, aiLoading, detailLoading, onClose, onBook,
}: {
  place: PlaceResult; detail: PlaceDetail | null; aiDescription: string | null;
  aiLoading: boolean; detailLoading: boolean; onClose: () => void; onBook: () => void;
}) {
  const { colors, isDark } = useTheme();
  const typeBg = isDark ? (TYPE_DARK_BG[place.serviceType] ?? colors.surface2) : (TYPE_LIGHT_BG[place.serviceType] ?? colors.surface2);

  const allRefs = Array.from(new Set([
    ...(detail?.extraPhotoRefs ?? []),
    ...(place.photoRef ? [place.photoRef] : []),
  ]));

  return (
    <View style={styles.detailOverlay}>
      <Pressable style={styles.detailBackdrop} onPress={onClose} />
      <View style={[styles.detailPanel, { backgroundColor: colors.surface }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Photo grid */}
          <View style={styles.photoGrid}>
            {allRefs.length === 0 ? (
              <View style={[styles.photoGridEmpty, { backgroundColor: typeBg }]}>
                <Text style={{ fontSize: 64 }}>{TYPE_EMOJI[place.serviceType] ?? '🐾'}</Text>
                <Text style={[styles.photoGridEmptyLabel, { color: colors.textSecondary }]}>{place.name}</Text>
              </View>
            ) : allRefs.length === 1 ? (
              <Image source={{ uri: getPhotoUrl(allRefs[0], 800) }} style={styles.photoSingle} resizeMode="cover" />
            ) : allRefs.length === 2 ? (
              <View style={styles.photoRowTwo}>
                <Image source={{ uri: getPhotoUrl(allRefs[0], 600) }} style={styles.photoHalf} resizeMode="cover" />
                <View style={[styles.photoGap, { backgroundColor: colors.background }]} />
                <Image source={{ uri: getPhotoUrl(allRefs[1], 600) }} style={styles.photoHalf} resizeMode="cover" />
              </View>
            ) : (
              <View style={styles.photoCollage}>
                <Image source={{ uri: getPhotoUrl(allRefs[0], 700) }} style={styles.photoHero} resizeMode="cover" />
                <View style={[styles.photoGap, { backgroundColor: colors.background }]} />
                <View style={styles.photoThumbCol}>
                  <Image source={{ uri: getPhotoUrl(allRefs[1], 400) }} style={styles.photoThumb} resizeMode="cover" />
                  <View style={[styles.photoGap, { backgroundColor: colors.background }]} />
                  <View style={styles.photoThumbLast}>
                    <Image source={{ uri: getPhotoUrl(allRefs[2], 400) }} style={styles.photoThumb} resizeMode="cover" />
                    {allRefs.length > 3 && (
                      <View style={styles.photoMoreOverlay}>
                        <Text style={styles.photoMoreText}>+{allRefs.length - 3}</Text>
                        <Text style={styles.photoMoreSub}>photos</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}
            <Pressable style={styles.detailClose} onPress={onClose}>
              <Text style={styles.detailCloseText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.detailContent}>
            <View style={styles.detailHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailName, { color: colors.text }]}>{place.name}</Text>
                <Text style={[styles.detailType, { color: colors.textSecondary }]}>
                  {TYPE_EMOJI[place.serviceType]} {place.serviceType?.replace('_', ' ')}
                  {place.isOpen !== null ? (place.isOpen ? ' · Open now' : ' · Closed') : ''}
                </Text>
              </View>
            </View>

            {place.rating !== null && (
              <View style={styles.detailRatingRow}>
                <StarRating rating={place.rating} />
                <Text style={[styles.detailRatingNum, { color: colors.text }]}> {place.rating.toFixed(1)}</Text>
                {place.reviewCount && (
                  <Text style={[styles.detailReviewCount, { color: colors.textTertiary }]}> ({place.reviewCount.toLocaleString()} reviews)</Text>
                )}
              </View>
            )}

            {/* AI Summary */}
            <View style={[styles.aiBox, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.aiLabel, { color: colors.primary }]}>✨ AI Summary</Text>
              {aiLoading
                ? <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
                : <Text style={[styles.aiText, { color: colors.text }]}>{aiDescription ?? 'Generating description…'}</Text>}
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{place.address || '—'}</Text>
            </View>
            <Text style={[styles.distanceText, { color: colors.textTertiary }]}>{place.distanceKm} km from your location</Text>

            {(detail?.phone || detailLoading) && (
              <TouchableOpacity style={styles.infoRow} onPress={() => detail?.phone && Linking.openURL(`tel:${detail.phone}`)} disabled={!detail?.phone}>
                <Text style={styles.infoIcon}>📞</Text>
                <Text style={[styles.infoText, { color: detail?.phone ? colors.blue : colors.textSecondary }, detail?.phone && styles.infoLink]}>
                  {detailLoading ? 'Loading…' : detail?.phone}
                </Text>
              </TouchableOpacity>
            )}

            {(detail?.website || detailLoading) && (
              <TouchableOpacity style={styles.infoRow} onPress={() => detail?.website && Linking.openURL(detail.website!)} disabled={!detail?.website}>
                <Text style={styles.infoIcon}>🌐</Text>
                <Text style={[styles.infoText, { color: detail?.website ? colors.blue : colors.textSecondary }, detail?.website && styles.infoLink]} numberOfLines={1}>
                  {detailLoading ? 'Loading…' : detail?.website}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnOutline, { borderColor: colors.borderStrong }]}
                onPress={() => Linking.openURL(place.directionsUrl)}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionBtnOutlineText, { color: colors.text }]}>🗺 Directions</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={onBook}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnFillText}>📅 Book</Text>
              </TouchableOpacity>
            </View>

            {detail?.reviews && detail.reviews.length > 0 && (
              <View style={[styles.reviewsSection, { borderTopColor: colors.separator }]}>
                <Text style={[styles.reviewsTitle, { color: colors.text }]}>Recent Reviews</Text>
                {detail.reviews.map((r, i) => (
                  <View key={i} style={[styles.reviewCard, { backgroundColor: colors.surface2 }]}>
                    <View style={styles.reviewHeader}>
                      <Text style={[styles.reviewAuthor, { color: colors.text }]}>{r.author}</Text>
                      <Text style={{ color: '#E8900A', fontSize: 12 }}>{'★'.repeat(r.rating)}</Text>
                    </View>
                    <Text style={[styles.reviewText, { color: colors.textSecondary }]} numberOfLines={4}>{r.text}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

// Map Google Places / web filter keys to our backend ServiceType for provider matching
const FILTER_TO_SERVICE: Record<string, string> = {
  VET: 'VET', GROOMER: 'GROOMER', PET_STORE: 'PET_STORE', KENNEL: 'PET_HOTEL',
};

export default function DiscoveryScreen() {
  const { colors, isDark } = useTheme();
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState(DUBAI);
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<PlaceResult | null>(null);
  const [detail, setDetail] = useState<PlaceDetail | null>(null);
  const [aiDescription, setAiDescription] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [mapLang, setMapLang] = useState<'en' | 'ar'>('en');
  const [bookingVisible, setBookingVisible] = useState(false);
  const [bookingProvider, setBookingProvider] = useState<Provider | null>(null);
  const providersCache = useRef<Provider[]>([]);

  const pendingPlace = usePendingDiscoveryStore((s) => s.pendingPlace);
  const prefilledDetail = usePendingDiscoveryStore((s) => s.prefilledDetail);
  const clearPendingDiscoveryPlace = usePendingDiscoveryStore((s) => s.clearPendingDiscoveryPlace);
  const onSelectPlaceRef = useRef<((p: PlaceResult) => void) | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000 },
    );
  }, []);

  // Pre-fetch our own backend providers so the Book button has real slot data
  useEffect(() => {
    providersService.nearby(DUBAI.lat, DUBAI.lng, 50)
      .then((p) => { providersCache.current = p; })
      .catch(() => {});
  }, []);

  const handleBook = useCallback(() => {
    if (!selected) return;
    const serviceType = FILTER_TO_SERVICE[selected.serviceType] ?? selected.serviceType;
    const match =
      providersCache.current.find((p) => p.serviceType === serviceType) ??
      providersCache.current[0] ??
      null;
    setBookingProvider(match);
    setBookingVisible(true);
  }, [selected]);

  const load = useCallback(async (type?: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await placesService.nearby(userLocation.lat, userLocation.lng, 15, type);
      setPlaces(data);
    } catch (e: any) {
      setLoadError(e?.message ?? 'Unknown error');
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  useEffect(() => { load(); }, [load]);

  const onFilterChange = (f: Filter) => {
    setFilter(f);
    setSelected(null);
    load(f === 'ALL' ? undefined : f);
  };

  const onSelectPlace = useCallback(async (p: PlaceResult) => {
    setSelected(p);
    setDetail(null);
    setAiDescription(null);
    setDetailLoading(true);
    setAiLoading(true);
    placesService.getDetail(p.id, userLocation.lat, userLocation.lng)
      .then((d) => setDetail(d)).catch(() => {}).finally(() => setDetailLoading(false));
    placesService.getAiDescription(p.id, p.name, p.serviceType, p.rating, p.reviewCount, p.address)
      .then((r) => setAiDescription(r.description))
      .catch(() => setAiDescription(`${p.name} is a professional pet service in the UAE.`))
      .finally(() => setAiLoading(false));
  }, [userLocation]);

  // Keep ref current so pending-place effect always calls the latest onSelectPlace
  useEffect(() => { onSelectPlaceRef.current = onSelectPlace; }, [onSelectPlace]);

  // When Vets screen sets a pending place, open its detail card immediately
  useEffect(() => {
    if (!pendingPlace) return;
    const filled = prefilledDetail;
    clearPendingDiscoveryPlace();
    setPlaces((prev) => prev.find((p) => p.id === pendingPlace.id) ? prev : [pendingPlace, ...prev]);

    if (filled) {
      // Registered provider — use pre-filled data, skip Places API calls
      setSelected(pendingPlace);
      setDetail({ ...pendingPlace, phone: filled.phone, website: filled.website, extraPhotoRefs: filled.extraPhotoRefs, reviews: filled.reviews } as PlaceDetail);
      setDetailLoading(false);
      setAiDescription(filled.aiDescription);
      setAiLoading(false);
    } else {
      // Google Places clinic — fetch full detail via API
      onSelectPlaceRef.current?.(pendingPlace);
    }
  }, [pendingPlace, prefilledDetail, clearPendingDiscoveryPlace]);

  const onClose = () => { setSelected(null); setDetail(null); setAiDescription(null); };

  const q = searchQuery.trim().toLowerCase();
  const displayedPlaces = q
    ? places.filter((p) => p.name.toLowerCase().includes(q) || (p.address ?? '').toLowerCase().includes(q))
    : places;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface2 }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }] as any}
            placeholder="Search places by name or address…"
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
        style={[styles.filterBarOuter, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => onFilterChange(f.key)}
            style={[
              styles.chip,
              { backgroundColor: filter === f.key ? colors.primaryLight : colors.surface2 },
              filter === f.key && { borderWidth: 1, borderColor: colors.primaryBorder },
            ]}
            activeOpacity={0.7}
          >
            <Text style={styles.chipEmoji}>{f.emoji}</Text>
            <Text style={[styles.chipLabel, { color: filter === f.key ? colors.primary : colors.textSecondary, fontWeight: filter === f.key ? '700' : '500' }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Map */}
      <View style={[styles.mapContainer, { backgroundColor: colors.surface2, borderBottomColor: colors.separator }]}>
        <LeafletMap
          places={displayedPlaces}
          center={userLocation}
          selectedId={selected?.id ?? null}
          onSelect={onSelectPlace}
          mapLang={mapLang}
        />
        {/* Language toggle */}
        <TouchableOpacity
          style={[styles.langToggle, { backgroundColor: colors.surface }]}
          onPress={() => setMapLang((l) => l === 'en' ? 'ar' : 'en')}
          activeOpacity={0.85}
        >
          <Text style={[styles.langToggleText, { color: colors.text }]}>
            {mapLang === 'en' ? 'عربي' : 'EN'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.textTertiary }]}>Finding pet services near you…</Text>
        </View>
      ) : loadError ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 36 }}>⚠️</Text>
          <Text style={[styles.emptyText, { color: colors.text }]}>Could not load places</Text>
          <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>{loadError}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primaryLight }]} onPress={() => load()}>
            <Text style={[styles.retryBtnText, { color: colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : places.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 36 }}>🔍</Text>
          <Text style={[styles.emptyText, { color: colors.text }]}>No places found nearby</Text>
          <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>Add a Google Places API key to your API .env for real results.</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primaryLight }]} onPress={() => load()}>
            <Text style={[styles.retryBtnText, { color: colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : displayedPlaces.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 36 }}>🔍</Text>
          <Text style={[styles.emptyText, { color: colors.text }]}>No results for "{searchQuery}"</Text>
          <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>Try a different name or address.</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          <Text style={[styles.listHeader, { color: colors.textTertiary }]}>
            {displayedPlaces.length} place{displayedPlaces.length !== 1 ? 's' : ''} found{q ? ` for "${searchQuery}"` : ' · sorted by distance'}
          </Text>
          {displayedPlaces.map((p) => (
            <PlaceCard key={p.id} place={p} selected={selected?.id === p.id} onPress={() => onSelectPlace(p)} />
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {selected && (
        <DetailPanel
          place={selected} detail={detail} aiDescription={aiDescription}
          aiLoading={aiLoading} detailLoading={detailLoading} onClose={onClose}
          onBook={handleBook}
        />
      )}

      <BookingModal
        visible={bookingVisible}
        provider={bookingProvider}
        onClose={() => setBookingVisible(false)}
        onBooked={() => {
          setBookingVisible(false);
          router.push('/(tabs)/bookings' as any);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 38, borderRadius: 12, paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 14, opacity: 0.5 },
  searchInput: { flex: 1, fontSize: 14, outlineStyle: 'none' } as any,

  filterBarOuter: { maxHeight: 56, borderBottomWidth: 1 },
  filterBar: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50, gap: 5 },
  chipEmoji: { fontSize: 14 },
  chipLabel: { fontSize: 13 },

  mapContainer: { height: 300, borderBottomWidth: 1, position: 'relative' },
  langToggle: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    zIndex: 1000,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 4 },
      android: { elevation: 4 },
      default: { boxShadow: '0 1px 5px rgba(0,0,0,0.25)' } as any,
    }),
  },
  langToggleText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  loadingText: { fontSize: 14, marginTop: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySubText: { fontSize: 13, marginTop: 4, textAlign: 'center', paddingHorizontal: 24, lineHeight: 19 },
  retryBtn: { marginTop: 16, borderRadius: 50, paddingHorizontal: 24, paddingVertical: 10 },
  retryBtnText: { fontSize: 14, fontWeight: '600' },

  list: { flex: 1 },
  listHeader: { fontSize: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },

  card: {
    flexDirection: 'row',
    marginHorizontal: 16, marginTop: 10, borderRadius: 20, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'transparent',
    ...Platform.select({ android: { elevation: 2 } }),
  },
  cardPhoto: { width: 90, height: 90, alignItems: 'center', justifyContent: 'center' },
  cardPhotoImg: { width: 90, height: 90 },
  cardBody: { flex: 1, padding: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 50 },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },
  openTag: { fontSize: 11, fontWeight: '600' },
  cardName: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  ratingNum: { fontSize: 13, fontWeight: '600' },
  reviewCount: { fontSize: 12 },
  cardMeta: { fontSize: 12, marginBottom: 1 },
  cardDist: { fontSize: 11, fontWeight: '500' },

  // Detail panel
  detailOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  detailBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  detailPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%', overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 20 } }),
  },

  photoGrid: { position: 'relative', height: 220 },
  photoGridEmpty: { height: 220, alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoGridEmptyLabel: { fontSize: 15, fontWeight: '600' },
  photoSingle: { width: '100%', height: 220 },
  photoRowTwo: { flexDirection: 'row', height: 220 },
  photoHalf: { flex: 1, height: 220 },
  photoCollage: { flexDirection: 'row', height: 220 },
  photoHero: { flex: 6, height: 220 },
  photoThumbCol: { flex: 4, flexDirection: 'column', height: 220 },
  photoThumb: { flex: 1, width: '100%' },
  photoThumbLast: { flex: 1, position: 'relative' },
  photoMoreOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.52)', alignItems: 'center', justifyContent: 'center' },
  photoMoreText: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  photoMoreSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  photoGap: { width: 2, height: 2 },

  detailClose: { position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  detailCloseText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  detailContent: { padding: 20 },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  detailName: { fontSize: 22, fontWeight: '700' },
  detailType: { fontSize: 13, marginTop: 3 },
  detailRatingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  detailRatingNum: { fontSize: 15, fontWeight: '700' },
  detailReviewCount: { fontSize: 13 },

  aiBox: { borderRadius: 16, padding: 14, marginBottom: 16 },
  aiLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  aiText: { fontSize: 14, lineHeight: 21 },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  infoIcon: { fontSize: 16, width: 24 },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20 },
  infoLink: { textDecorationLine: 'underline' },
  distanceText: { fontSize: 12, marginBottom: 20, marginLeft: 34 },

  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  actionBtn: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionBtnOutline: { borderWidth: 1.5 },
  actionBtnOutlineText: { fontSize: 14, fontWeight: '600' },
  actionBtnFillText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  reviewsSection: { borderTopWidth: 1, paddingTop: 20 },
  reviewsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  reviewCard: { borderRadius: 14, padding: 14, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewAuthor: { fontSize: 13, fontWeight: '600' },
  reviewText: { fontSize: 13, lineHeight: 19 },
});
