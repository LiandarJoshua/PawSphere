import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { usePendingDiscoveryStore } from '../../store/pendingDiscovery';
import { placesService, getPhotoUrl, type PlaceResult, type PlaceDetail } from '../../services/places';
import { providersService, type Provider } from '../../services/providers';
import { BookingModal } from '../../components/BookingModal';
import { useTheme } from '../../theme/ThemeContext';

const DUBAI = { lat: 25.2048, lng: 55.2708 };
const { height: SCREEN_H } = Dimensions.get('window');

type Filter = 'ALL' | 'VET' | 'GROOMER' | 'PET_STORE' | 'KENNEL';

const FILTERS: Array<{ key: Filter; label: string; emoji: string }> = [
  { key: 'ALL',      label: 'All',      emoji: '🐾' },
  { key: 'VET',      label: 'Vets',     emoji: '🏥' },
  { key: 'GROOMER',  label: 'Groomers', emoji: '✂️' },
  { key: 'PET_STORE',label: 'Stores',   emoji: '🛍️' },
  { key: 'KENNEL',   label: 'Kennels',  emoji: '🏡' },
];

const TYPE_EMOJI: Record<string, string> = {
  VET: '🏥', GROOMER: '✂️', PET_STORE: '🛍️', KENNEL: '🏡', PET_HOTEL: '🏡', TRAINER: '🎓',
};
const TYPE_COLOR: Record<string, string> = {
  VET: '#4A9EFF', GROOMER: '#9D7FEA', PET_STORE: '#2EBD54', KENNEL: '#E8900A', PET_HOTEL: '#E8900A', TRAINER: '#9D7FEA',
};
const TYPE_BG: Record<string, string> = {
  VET: '#EDF5FF', GROOMER: '#EDE9FE', PET_STORE: '#EDFFF3', KENNEL: '#FFF4E5', PET_HOTEL: '#FFF4E5', TRAINER: '#F5EFFE',
};
const FILTER_TO_SERVICE: Record<string, string> = {
  VET: 'VET', GROOMER: 'GROOMER', PET_STORE: 'PET_STORE', KENNEL: 'PET_HOTEL',
};

// ─── Leaflet HTML ─────────────────────────────────────────────────────────────

function buildLeafletHTML(lat: number, lng: number): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html,body,#map{margin:0;padding:0;width:100%;height:100%;background:#f2ede6;}
  .leaflet-control-attribution{font-size:8px;}
  @keyframes pulse{0%,100%{transform:scale(1);opacity:0.25;}50%{transform:scale(1.8);opacity:0;}}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map = L.map('map',{zoomControl:false}).setView([${lat},${lng}],13);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{
  attribution:'© CARTO © OpenStreetMap',maxZoom:19
}).addTo(map);
L.control.zoom({position:'bottomright'}).addTo(map);

// User location — injected from React Native via setUserLocation(lat, lng, accuracy)
var userDot = null;
var userRing = null;
window.setUserLocation = function(lat, lng, accuracy) {
  var latlng = [lat, lng];
  // Accuracy ring
  if(userRing){ userRing.setLatLng(latlng).setRadius(accuracy); }
  else {
    userRing = L.circle(latlng, {
      radius: accuracy,
      color: '#4285F4', weight: 1,
      fillColor: '#4285F4', fillOpacity: 0.12,
      interactive: false,
    }).addTo(map);
  }
  // Blue dot with white border + shadow (Google Maps style)
  var dotIcon = L.divIcon({
    html: '<div style="position:relative;width:20px;height:20px;">'
        + '<div style="position:absolute;inset:0;background:#4285F4;border-radius:50%;opacity:0.25;animation:pulse 2s infinite;"></div>'
        + '<div style="position:absolute;inset:2px;background:#4285F4;border-radius:50%;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(66,133,244,0.6);"></div>'
        + '</div>',
    iconSize: [20, 20], iconAnchor: [10, 10], className: '',
  });
  if(userDot){ userDot.setLatLng(latlng); }
  else { userDot = L.marker(latlng, { icon: dotIcon, zIndexOffset: 2000, interactive: false }).addTo(map); }
};

var markers = [];
function clearMarkers(){markers.forEach(function(m){m.remove();});markers=[];}

window.setPlaces = function(places,selectedId){
  clearMarkers();
  places.forEach(function(p){
    var isSelected = p.id === selectedId;
    var emoji = {VET:'🏥',GROOMER:'✂️',PET_STORE:'🛍️',KENNEL:'🏡',PET_HOTEL:'🏡',TRAINER:'🎓'}[p.serviceType] || '🐾';
    var colors = {VET:'#4A9EFF',GROOMER:'#9D7FEA',PET_STORE:'#2EBD54',KENNEL:'#E8900A',PET_HOTEL:'#E8900A',TRAINER:'#9D7FEA'};
    var bg = isSelected ? '#9D7FEA' : (colors[p.serviceType] || '#666');
    var size = isSelected ? 44 : 36;
    var fs = isSelected ? 20 : 16;
    var icon = L.divIcon({
      html:'<div style="background:'+bg+';border-radius:50%;width:'+size+'px;height:'+size+'px;display:flex;align-items:center;justify-content:center;font-size:'+fs+'px;box-shadow:0 2px 10px rgba(0,0,0,0.35);border:2px solid rgba(255,255,255,0.3);">'+emoji+'</div>',
      iconSize:[size,size],iconAnchor:[size/2,size/2],className:''
    });
    var m = L.marker([p.lat,p.lng],{icon:icon}).addTo(map);
    m.on('click',function(){
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'SELECT',id:p.id}));
    });
    markers.push(m);
  });
};

window.panTo = function(lat,lng){
  map.panTo([lat,lng],{animate:true});
};
</script>
</body>
</html>`;
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

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  place, detail, aiDescription, aiLoading, detailLoading, onClose, onBook,
}: {
  place: PlaceResult; detail: PlaceDetail | null; aiDescription: string | null;
  aiLoading: boolean; detailLoading: boolean; onClose: () => void; onBook: () => void;
}) {
  const { colors } = useTheme();
  const accent = TYPE_COLOR[place.serviceType] ?? colors.primary;
  const typeBg = TYPE_BG[place.serviceType] ?? colors.surface2;
  const photoUrl = place.photoRef ? getPhotoUrl(place.photoRef, 600) : null;

  return (
    <View style={styles.detailContainer}>
      <Pressable style={styles.detailBackdrop} onPress={onClose} />
      <View style={[styles.detailPanel, { backgroundColor: colors.surface }]}>
        {/* Drag handle */}
        <View style={styles.dragHandle}>
          <View style={[styles.dragBar, { backgroundColor: colors.separator }]} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Photo */}
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.detailPhoto} resizeMode="cover" />
          ) : (
            <View style={[styles.detailPhotoPlaceholder, { backgroundColor: typeBg }]}>
              <Text style={{ fontSize: 56 }}>{TYPE_EMOJI[place.serviceType] ?? '🐾'}</Text>
            </View>
          )}

          {/* Close button */}
          <Pressable style={styles.detailClose} onPress={onClose}>
            <Text style={styles.detailCloseText}>✕</Text>
          </Pressable>

          <View style={styles.detailContent}>
            {/* Name + type */}
            <Text style={[styles.detailName, { color: colors.text }]}>{place.name}</Text>
            <View style={styles.detailMeta}>
              <View style={[styles.typeBadge, { backgroundColor: typeBg }]}>
                <Text style={[styles.typeBadgeText, { color: accent }]}>
                  {TYPE_EMOJI[place.serviceType]} {place.serviceType?.replace('_', ' ')}
                </Text>
              </View>
              {place.isOpen !== null && (
                <Text style={[styles.openTag, { color: place.isOpen ? '#34C759' : '#FF3B30' }]}>
                  {place.isOpen ? '● Open' : '● Closed'}
                </Text>
              )}
            </View>

            {/* Rating */}
            {place.rating !== null && (
              <View style={styles.ratingRow}>
                <StarRating rating={place.rating} />
                <Text style={[styles.ratingNum, { color: colors.text }]}> {place.rating.toFixed(1)}</Text>
                {place.reviewCount != null && (
                  <Text style={[styles.reviewCount, { color: colors.textTertiary }]}> ({place.reviewCount.toLocaleString()} reviews)</Text>
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

            {/* Address */}
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{place.address || '—'}</Text>
            </View>
            <Text style={[styles.distText, { color: colors.textTertiary }]}>{place.distanceKm} km from your location</Text>

            {/* Phone */}
            {(detail?.phone || detailLoading) && (
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => detail?.phone && Linking.openURL(`tel:${detail.phone}`)}
                disabled={!detail?.phone}
              >
                <Text style={styles.infoIcon}>📞</Text>
                <Text style={[styles.infoText, { color: detail?.phone ? colors.primary : colors.textSecondary }]}>
                  {detailLoading ? 'Loading…' : detail?.phone}
                </Text>
              </TouchableOpacity>
            )}

            {/* Website */}
            {(detail?.website || detailLoading) && (
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => detail?.website && Linking.openURL(detail.website!)}
                disabled={!detail?.website}
              >
                <Text style={styles.infoIcon}>🌐</Text>
                <Text style={[styles.infoText, { color: detail?.website ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
                  {detailLoading ? 'Loading…' : detail?.website}
                </Text>
              </TouchableOpacity>
            )}

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnOutline, { borderColor: colors.separator }]}
                onPress={() => Linking.openURL(place.directionsUrl)}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionBtnOutlineText, { color: colors.text }]}>🗺 Directions</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onBook}
                activeOpacity={0.8}
                style={{
                  flex: 1, height: 44, borderRadius: 14,
                  backgroundColor: '#8B5CF6',
                  flexDirection: 'row',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 16 }}>📅</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Book</Text>
              </TouchableOpacity>
            </View>

            {/* Reviews */}
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

export default function DiscoveryScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { focusLat, focusLng } = useLocalSearchParams<{
    focusLat?: string; focusLng?: string;
  }>();

  const webViewRef = useRef<WebView>(null);
  const providersCache = useRef<Provider[]>([]);
  const placesRef = useRef<PlaceResult[]>([]);
  const onSelectPlaceRef = useRef<((p: PlaceResult) => void) | null>(null);

  const [userCoords, setUserCoords] = useState(DUBAI);
  const [locationLabel, setLocationLabel] = useState('Dubai, UAE');
  const [mapReady, setMapReady] = useState(false);
  const userCoordsRef = useRef(DUBAI);
  const userAccuracyRef = useRef(500);

  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [selected, setSelected] = useState<PlaceResult | null>(null);
  const [detail, setDetail] = useState<PlaceDetail | null>(null);
  const [aiDescription, setAiDescription] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const [bookingVisible, setBookingVisible] = useState(false);
  const [bookingProvider, setBookingProvider] = useState<Provider | null>(null);

  // Keep ref in sync for use in WebView message handler
  useEffect(() => { placesRef.current = places; }, [places]);

  // Pan to provider coordinates when navigated from Vets screen (doctor cards)
  useEffect(() => {
    if (!focusLat || !focusLng || !mapReady) return;
    const lat = parseFloat(focusLat);
    const lng = parseFloat(focusLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      webViewRef.current?.injectJavaScript(`window.panTo(${lat},${lng});true;`);
    }
  }, [focusLat, focusLng, mapReady]);

  const injectPlaces = useCallback((ps: PlaceResult[], selId: string | null) => {
    if (!webViewRef.current) return;
    webViewRef.current.injectJavaScript(
      `window.setPlaces(${JSON.stringify(ps)},${JSON.stringify(selId)});true;`
    );
  }, []);

  const injectUserLocation = useCallback((lat: number, lng: number, accuracy: number) => {
    if (!webViewRef.current) return;
    webViewRef.current.injectJavaScript(
      `window.setUserLocation(${lat},${lng},${accuracy});true;`
    );
  }, []);

  const load = useCallback(async (coords: typeof DUBAI, type?: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await placesService.nearby(coords.lat, coords.lng, 15, type);
      setPlaces(data);
      if (mapReady) injectPlaces(data, null);
    } catch (e: any) {
      setLoadError(e?.message ?? 'Unknown error');
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, [mapReady, injectPlaces]);

  // Geolocation + initial load
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let coords = DUBAI;
      let accuracy = 500;
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        accuracy = loc.coords.accuracy ?? 500;
        setUserCoords(coords);
        userCoordsRef.current = coords;
        userAccuracyRef.current = accuracy;
        const [place] = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lng }).catch(() => [null]);
        if (place) setLocationLabel([place.city, place.country].filter(Boolean).join(', '));
      }
      load(coords);
      providersService.nearby(coords.lat, coords.lng, 50)
        .then((p) => { providersCache.current = p; }).catch(() => {});
    })();
  }, []);

  // When map becomes ready, inject places + user location dot + pan to real location
  useEffect(() => {
    if (!mapReady) return;
    if (placesRef.current.length > 0) injectPlaces(placesRef.current, selected?.id ?? null);
    const { lat, lng } = selected
      ? { lat: selected.lat, lng: selected.lng }
      : userCoordsRef.current;
    injectUserLocation(userCoordsRef.current.lat, userCoordsRef.current.lng, userAccuracyRef.current);
    webViewRef.current?.injectJavaScript(`window.panTo(${lat},${lng});true;`);
  }, [mapReady]);

  const onFilterChange = (f: Filter) => {
    setFilter(f);
    setSelected(null);
    load(userCoords, f === 'ALL' ? undefined : f);
  };

  const onSelectPlace = useCallback(async (p: PlaceResult) => {
    setSelected(p);
    setDetail(null);
    setAiDescription(null);
    injectPlaces(placesRef.current, p.id);
    webViewRef.current?.injectJavaScript(`window.panTo(${p.lat},${p.lng});true;`);

    setDetailLoading(true);
    setAiLoading(true);
    try {
      const [d, ai] = await Promise.all([
        placesService.getDetail(p.id, userCoords.lat, userCoords.lng),
        placesService.getAiDescription(p.id, p.name, p.serviceType, p.rating, p.reviewCount, p.address),
      ]);
      setDetail(d);
      setDetailLoading(false);
      setAiDescription(ai.description);
      setAiLoading(false);
    } catch {
      setDetailLoading(false);
      setAiLoading(false);
    }
  }, [userCoords, injectPlaces]);

  // Keep ref current so focus effect always calls the latest onSelectPlace
  useEffect(() => { onSelectPlaceRef.current = onSelectPlace; }, [onSelectPlace]);

  const pendingPlace = usePendingDiscoveryStore((s) => s.pendingPlace);
  const prefilledDetail = usePendingDiscoveryStore((s) => s.prefilledDetail);
  const clearPendingDiscoveryPlace = usePendingDiscoveryStore((s) => s.clearPendingDiscoveryPlace);

  // When Vets screen sets a pending place, open its detail card
  useEffect(() => {
    if (!pendingPlace) return;
    const filled = prefilledDetail;
    clearPendingDiscoveryPlace();
    setPlaces((prev) => {
      const merged = prev.find((p) => p.id === pendingPlace.id) ? prev : [pendingPlace, ...prev];
      placesRef.current = merged;
      return merged;
    });

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

  const onWebViewMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'SELECT') {
        const found = placesRef.current.find((p) => p.id === msg.id);
        if (found) onSelectPlace(found);
      }
    } catch {}
  }, [onSelectPlace]);

  const q = searchQuery.trim().toLowerCase();
  const displayed = q
    ? places.filter((p) => p.name.toLowerCase().includes(q) || (p.address ?? '').toLowerCase().includes(q))
    : places;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top safe area */}
      <View style={{ height: insets.top, backgroundColor: colors.surface }} />

      {/* Location banner */}
      <View style={[styles.locationBanner, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
        <Text style={styles.locationPin}>📍</Text>
        <Text style={[styles.locationText, { color: colors.text }]}>{locationLabel}</Text>
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface2 }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by name or address…"
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
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => onFilterChange(f.key)}
            style={[
              styles.chip,
              { backgroundColor: filter === f.key ? colors.primaryLight : colors.surface2 },
              filter === f.key && { borderWidth: 1, borderColor: colors.primaryBorder },
            ]}
          >
            <Text style={styles.chipEmoji}>{f.emoji}</Text>
            <Text style={[
              styles.chipLabel,
              { color: filter === f.key ? colors.primary : colors.textSecondary,
                fontWeight: filter === f.key ? '700' : '500' },
            ]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Map */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          style={styles.map}
          source={{ html: buildLeafletHTML(userCoords.lat, userCoords.lng) }}
          onLoad={() => setMapReady(true)}
          onMessage={onWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
          geolocationEnabled
          originWhitelist={['*']}
          mixedContentMode="always"
          allowsInlineMediaPlayback
        />
        {loading && (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.mapLoadingText, { color: colors.textTertiary }]}>Finding pet services…</Text>
          </View>
        )}
        {loadError && (
          <View style={styles.mapLoadingOverlay}>
            <Text style={{ fontSize: 32 }}>⚠️</Text>
            <Text style={[{ color: colors.text, fontWeight: '600', marginTop: 8 }]}>Could not load places</Text>
            <Text style={[{ color: colors.textTertiary, fontSize: 13 }]}>{loadError}</Text>
          </View>
        )}
      </View>

      {/* Place list */}
      {!loading && !loadError && displayed.length > 0 && !selected && (
        <View style={[styles.listContainer, { backgroundColor: colors.background }]}>
          <FlatList
            data={displayed}
            keyExtractor={(p) => p.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            snapToAlignment="start"
            decelerationRate="fast"
            renderItem={({ item: p }) => {
              const accent = TYPE_COLOR[p.serviceType] ?? colors.primary;
              const typeBg = TYPE_BG[p.serviceType] ?? colors.surface2;
              const photoUrl = p.photoRef ? getPhotoUrl(p.photoRef, 200) : null;
              return (
                <Pressable
                  style={[styles.listCard, { backgroundColor: colors.surface }]}
                  onPress={() => onSelectPlace(p)}
                >
                  <View style={[styles.listCardPhoto, { backgroundColor: typeBg }]}>
                    {photoUrl
                      ? <Image source={{ uri: photoUrl }} style={styles.listCardPhotoImg} resizeMode="cover" />
                      : <Text style={{ fontSize: 24 }}>{TYPE_EMOJI[p.serviceType] ?? '🐾'}</Text>}
                  </View>
                  <View style={styles.listCardBody}>
                    <View style={[styles.typeBadge, { backgroundColor: typeBg }]}>
                      <Text style={[styles.typeBadgeText, { color: accent }]}>
                        {TYPE_EMOJI[p.serviceType]} {p.serviceType?.replace('_', ' ')}
                      </Text>
                    </View>
                    <Text style={[styles.listCardName, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
                    {p.rating != null && (
                      <View style={styles.ratingRow}>
                        <StarRating rating={p.rating} />
                        <Text style={[styles.ratingNum, { color: colors.text }]}> {p.rating.toFixed(1)}</Text>
                      </View>
                    )}
                    <Text style={[styles.listCardDist, { color: colors.textTertiary }]}>{p.distanceKm} km away</Text>
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      )}

      {/* Detail panel */}
      {selected && (
        <DetailPanel
          place={selected}
          detail={detail}
          aiDescription={aiDescription}
          aiLoading={aiLoading}
          detailLoading={detailLoading}
          onClose={() => {
            setSelected(null);
            injectPlaces(placesRef.current, null);
          }}
          onBook={handleBook}
        />
      )}

      <BookingModal
        visible={bookingVisible}
        provider={bookingProvider}
        onClose={() => setBookingVisible(false)}
        onBooked={() => {
          setBookingVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  locationBanner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 6,
  },
  locationPin: { fontSize: 14 },
  locationText: { fontSize: 14, fontWeight: '600' },

  searchRow: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, height: 38, borderRadius: 12, paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 14, opacity: 0.5 },
  searchInput: { flex: 1, fontSize: 14 },

  filterBar: { maxHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth },
  filters: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50, gap: 5,
  },
  chipEmoji: { fontSize: 14 },
  chipLabel: { fontSize: 13 },

  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  mapLoadingText: { fontSize: 14 },

  listContainer: { maxHeight: 190 },
  listContent: { paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  listCard: {
    width: 220, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  listCardPhoto: { height: 90, alignItems: 'center', justifyContent: 'center' },
  listCardPhotoImg: { width: '100%', height: '100%' },
  listCardBody: { padding: 10, gap: 4 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 50,
    alignSelf: 'flex-start',
  },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  listCardName: { fontSize: 13, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingNum: { fontSize: 12, fontWeight: '600' },
  reviewCount: { fontSize: 11 },
  listCardDist: { fontSize: 11 },

  // Detail panel
  detailContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  detailBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  detailPanel: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: SCREEN_H * 0.82,
    overflow: 'hidden',
  },
  dragHandle: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  dragBar: { width: 40, height: 4, borderRadius: 2 },
  detailPhoto: { width: '100%', height: 200 },
  detailPhotoPlaceholder: { height: 160, alignItems: 'center', justifyContent: 'center' },
  detailClose: {
    position: 'absolute', top: 12, right: 14,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  detailCloseText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  detailContent: { padding: 16, gap: 10 },
  detailName: { fontSize: 20, fontWeight: '800', lineHeight: 26 },
  detailMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  openTag: { fontSize: 12, fontWeight: '600' },
  aiBox: { borderRadius: 14, padding: 14, gap: 6 },
  aiLabel: { fontSize: 12, fontWeight: '700' },
  aiText: { fontSize: 13, lineHeight: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoIcon: { fontSize: 14, marginTop: 1 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 20 },
  distText: { fontSize: 12, marginTop: -6 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: {
    flex: 1, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnOutline: { borderWidth: 1.5 },
  actionBtnFill: { backgroundColor: '#8B5CF6' },
  actionBtnOutlineText: { fontSize: 14, fontWeight: '600' },
  actionBtnFillText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  reviewsSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, gap: 10 },
  reviewsTitle: { fontSize: 15, fontWeight: '700' },
  reviewCard: { borderRadius: 12, padding: 12, gap: 4 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewAuthor: { fontSize: 13, fontWeight: '600' },
  reviewText: { fontSize: 12, lineHeight: 18 },
});
