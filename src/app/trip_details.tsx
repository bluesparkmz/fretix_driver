import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { CustomDialog } from '@/components/custom-dialog';
import { LoadTypeImage } from '@/components/load-type-image';
import { TripStatusBadge, type LoadStatusType } from '@/components/trip-status-indicator';
import { FretixColors } from '@/constants/theme';
import { useDriverTripLocationSharing } from '@/hooks/useDriverTripLocationSharing';
import { useTripRealtime } from '@/hooks/useTripRealtime';
import {
  googleMapsService,
  type GoogleRouteSuggestion,
  type GoogleRouteStep,
  type MapCoordinate,
  type MozambiquePlaceSuggestion,
} from '@/services/google-maps';
import { loadService, type LoadDetail } from '@/services/loads';
import { tripService, type Trip, type TripLocation, type TripStop } from '@/services/trips';
import { resolveMediaUrl } from '@/utils/media-url';
import { buildReturnTo, goBackSmart, pushWithReturnTo, useSmartBackHandler } from '@/utils/navigation';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_HEIGHT = 178;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.72;
const DRAG_THRESHOLD = 60;
const FOOTER_HEIGHT = 130;

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#171C22' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#E5E7EB' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#05070A' }, { weight: 3 }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#F8FAFC' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#CBD5E1' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1F2937' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#CBD5E1' }] },
  // Keep the map clean generally, but let Google show useful nearby places
  // (shops, hospitals, fuel stations) naturally when the driver zooms in.
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.business', elementType: 'labels.text', stylers: [{ visibility: 'on' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2F3845' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#111827' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#F9FAFB' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#4B5563' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#111827' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#FFE082' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#273244' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#CBD5E1' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#08111C' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#93C5FD' }] },
];

type Coordinate = MapCoordinate;
const REROUTE_DISTANCE_THRESHOLD_KM = 0.5;
const REROUTE_MIN_INTERVAL_MS = 30_000;
const NAVIGATION_CAMERA_ZOOM = 17;
const NAVIGATION_CAMERA_PITCH = 67;
const GUIDANCE_HIGHLIGHT_DISTANCE_KM = 0.3;
const DEFAULT_MAP_CENTER: Coordinate = { latitude: -18.6657, longitude: 35.5296 };

const getTripStatus = (status: string): LoadStatusType => {
  if (status === 'aguardando_inicio') return 'disponivel';
  if (status === 'indo_carregar') return 'indo_carregar';
  if (status === 'chegou_origem') return 'chegou_origem';
  if (status === 'carregado') return 'carregado';
  if (status === 'viagem_iniciada') return 'em_viagem';
  if (status === 'aguardando_cliente') return 'em_andamento';
  if (status === 'concluida') return 'concluido';
  if (status === 'cancelado') return 'cancelado';
  return 'disponivel';
};

const getTripStatusLabel = (status: string) => {
  if (status === 'aguardando_inicio') return 'Aguardando início';
  if (status === 'indo_carregar') return 'Indo Carregar';
  if (status === 'chegou_origem') return 'Chegou à Origem';
  if (status === 'carregado') return 'Carga Carregada';
  if (status === 'viagem_iniciada') return 'Em Viagem';
  if (status === 'aguardando_cliente') return 'Aguardando Cliente';
  if (status === 'concluida') return 'Concluída';
  if (status === 'cancelado') return 'Cancelada';
  return status.replace(/_/g, ' ');
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'Não informado';
  return new Date(dateStr).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('pt-MZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return 'Sob consulta';
  return `${value.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT`;
};

const formatDistance = (value?: number | null) => {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(1)} km`;
};

const toCoordinateNumber = (value: number | string | null | undefined) => {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : value;
  return Number.isFinite(parsed) ? Number(parsed) : null;
};

const getCoordinate = (
  latitude: number | string | null | undefined,
  longitude: number | string | null | undefined,
): Coordinate | null => {
  const parsedLatitude = toCoordinateNumber(latitude);
  const parsedLongitude = toCoordinateNumber(longitude);
  if (parsedLatitude == null || parsedLongitude == null) return null;
  const coordinate = { latitude: parsedLatitude, longitude: parsedLongitude };
  return isUsableCoordinate(coordinate) ? coordinate : null;
};

const getFirstUsableCoordinate = (
  primaryLatitude: number | string | null | undefined,
  primaryLongitude: number | string | null | undefined,
  secondaryLatitude: number | string | null | undefined,
  secondaryLongitude: number | string | null | undefined,
) => getCoordinate(primaryLatitude, primaryLongitude) ?? getCoordinate(secondaryLatitude, secondaryLongitude);

const getTripRouteData = (trip: Trip) => {
  const load = trip.load;
  const origin = load?.origin ?? trip.origin ?? 'Origem indisponível';
  const destination = load?.destination ?? trip.destination ?? 'Destino indisponível';
  const loadTitle =
    load?.load_name ||
    (load?.load_type ? `Carga de ${load.load_type}` : trip.load_code || `Carga #${trip.load_id ?? trip.id}`);
  // Never invent a coordinate here. A fixed fallback can put a Lichinga trip
  // hundreds of kilometres away; when coordinates are missing, Google resolves
  // the saved address instead. The load is the source selected in CargoLink's
  // location picker, so it takes priority over a potentially stale trip copy.
  const originCoordinate = getFirstUsableCoordinate(
    load?.origin_lat, load?.origin_lng, trip.origin_lat, trip.origin_lng,
  );
  const destinationCoordinate = getFirstUsableCoordinate(
    load?.destination_lat, load?.destination_lng, trip.destination_lat, trip.destination_lng,
  );

  return { origin, destination, loadTitle, originCoordinate, destinationCoordinate };
};

const coordinatesMatch = (a: Coordinate, b: Coordinate) =>
  Math.abs(a.latitude - b.latitude) < 0.00001 && Math.abs(a.longitude - b.longitude) < 0.00001;

const normalizeTripLocations = (locations: TripLocation[]): Coordinate[] =>
  locations
    .map((location) => ({ latitude: location.latitude, longitude: location.longitude }))
    .filter((coordinate, index, all) => index === 0 || !coordinatesMatch(coordinate, all[index - 1]));

const getDistanceKm = (a: Coordinate, b: Coordinate) => {
  const radiusKm = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const buildTraveledRouteCoordinates = (
  historyCoordinates: Coordinate[],
  liveCoordinate: Coordinate | null,
) => {
  const combined = [...historyCoordinates];
  if (liveCoordinate) {
    const last = combined[combined.length - 1];
    if (!last || !coordinatesMatch(last, liveCoordinate)) combined.push(liveCoordinate);
  }
  return combined;
};

const getProgressValue = (trip: Trip) => {
  if (typeof trip.progress_percent === 'number' && Number.isFinite(trip.progress_percent)) {
    return Math.max(0, Math.min(100, trip.progress_percent));
  }
  if (
    typeof trip.traveled_distance_km === 'number' &&
    typeof trip.total_distance_km === 'number' &&
    trip.total_distance_km > 0
  ) {
    return Math.max(0, Math.min(100, (trip.traveled_distance_km / trip.total_distance_km) * 100));
  }
  if (trip.status === 'concluida') return 100;
  if (trip.status === 'aguardando_cliente') return 95;
  if (trip.status === 'viagem_iniciada') return 0;
  return 0;
};

const formatCoordinate = (coordinate: Coordinate) =>
  `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`;

const isUsableCoordinate = (coordinate: Coordinate) =>
  Number.isFinite(coordinate.latitude) &&
  Number.isFinite(coordinate.longitude) &&
  Math.abs(coordinate.latitude) <= 90 &&
  Math.abs(coordinate.longitude) <= 180 &&
  !(Math.abs(coordinate.latitude) < 0.0001 && Math.abs(coordinate.longitude) < 0.0001);

const getDirectionsEndpoint = (coordinate: Coordinate | null, address: string) =>
  coordinate ? coordinate : `${address}, Mocambique`;

const getBearing = (from: Coordinate, to: Coordinate) => {
  const startLat = (from.latitude * Math.PI) / 180;
  const endLat = (to.latitude * Math.PI) / 180;
  const deltaLng = ((to.longitude - from.longitude) * Math.PI) / 180;
  const y = Math.sin(deltaLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(deltaLng);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
};

const getNearestRouteIndex = (coordinate: Coordinate, route: Coordinate[]) => {
  if (route.length === 0) return 0;
  return route.reduce(
    (closest, point, index) => {
      const distance = getDistanceKm(coordinate, point);
      return distance < closest.distance ? { index, distance } : closest;
    },
    { index: 0, distance: Number.POSITIVE_INFINITY },
  ).index;
};

const getRemainingRouteCoordinates = (current: Coordinate, route: Coordinate[], isTripStarted: boolean) => {
  if (!isTripStarted || route.length < 2) return route;
  const nearestIndex = getNearestRouteIndex(current, route);
  return [current, ...route.slice(Math.min(nearestIndex + 1, route.length - 1))];
};

const getTraveledRoadCoordinates = (current: Coordinate, route: Coordinate[], isTripStarted: boolean) => {
  if (!isTripStarted || route.length < 2) return [];
  const nearestIndex = getNearestRouteIndex(current, route);
  return [...route.slice(0, nearestIndex + 1), current];
};

const splitGuidanceRoute = (current: Coordinate, route: Coordinate[], isTripStarted: boolean) => {
  const remaining = getRemainingRouteCoordinates(current, route, isTripStarted);
  if (!isTripStarted || remaining.length < 2) return { highlighted: remaining, preview: [] as Coordinate[] };

  let distanceKm = 0;
  let splitIndex = remaining.length - 1;
  for (let index = 1; index < remaining.length; index += 1) {
    distanceKm += getDistanceKm(remaining[index - 1], remaining[index]);
    if (distanceKm >= GUIDANCE_HIGHLIGHT_DISTANCE_KM) {
      splitIndex = index;
      break;
    }
  }

  return {
    highlighted: remaining.slice(0, splitIndex + 1),
    // Include the last highlighted point so the thin continuation joins it.
    preview: remaining.slice(splitIndex),
  };
};

const ensureRouteEndsAtDestination = (route: Coordinate[], destination: Coordinate | null) => {
  if (!destination || route.length === 0) return route;
  const lastPoint = route[route.length - 1];
  return getDistanceKm(lastPoint, destination) < 0.02 ? route : [...route, destination];
};

const buildRouteWaypoints = (history: Coordinate[], liveCoordinate: Coordinate | null) => {
  const combined = buildTraveledRouteCoordinates(history, liveCoordinate);
  if (combined.length <= 23) return combined;
  const stride = Math.ceil(combined.length / 23);
  return combined.filter((_, index) => index === combined.length - 1 || index % stride === 0).slice(0, 23);
};

const getNextNavigationStep = (current: Coordinate, steps: GoogleRouteStep[]) => {
  if (steps.length === 0) return null;
  const nextStep = steps.find((step) => getDistanceKm(current, step.endLocation) > 0.08) ?? steps[steps.length - 1];
  return {
    ...nextStep,
    distanceKm: getDistanceKm(current, nextStep.endLocation),
  };
};

export default function TripDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string; returnTo?: string | string[]; from?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const from = Array.isArray(params.from) ? params.from[0] : params.from;
  const numericTripId = id ? Number.parseInt(id, 10) : null;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loadedTripId, setLoadedTripId] = useState<string | null>(null);
  const [routeLoad, setRouteLoad] = useState<LoadDetail | null>(null);
  const [stops, setStops] = useState<TripStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [routePath, setRoutePath] = useState<Coordinate[]>([]);
  const [routeOptions, setRouteOptions] = useState<GoogleRouteSuggestion[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [locationHistory, setLocationHistory] = useState<TripLocation[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [is3DMode, setIs3DMode] = useState(true);
  const [currentPlace, setCurrentPlace] = useState<MozambiquePlaceSuggestion | null>(null);
  const [currentPlaceLoading, setCurrentPlaceLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogProps, setDialogProps] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info',
  });

  const sheetHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const lastHeight = useRef(COLLAPSED_HEIGHT);
  const mapRef = useRef<MapView | null>(null);
  const lastRerouteRef = useRef<{ coordinate: Coordinate; timestamp: number } | null>(null);
  const tripLoadRequestRef = useRef(0);
  useSmartBackHandler({ returnTo, from, fallback: '/trips' });

  const handleBack = () => goBackSmart({ returnTo, from, fallback: '/trips' });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        const newH = Math.max(COLLAPSED_HEIGHT, Math.min(EXPANDED_HEIGHT, lastHeight.current - g.dy));
        sheetHeight.setValue(newH);
      },
      onPanResponderRelease: (_, g) => {
        const expanding = g.dy < -DRAG_THRESHOLD;
        const collapsing = g.dy > DRAG_THRESHOLD;
        const target = expanding
          ? EXPANDED_HEIGHT
          : collapsing
            ? COLLAPSED_HEIGHT
            : lastHeight.current > (COLLAPSED_HEIGHT + EXPANDED_HEIGHT) / 2
              ? EXPANDED_HEIGHT
              : COLLAPSED_HEIGHT;

        lastHeight.current = target;
        setIsExpanded(target === EXPANDED_HEIGHT);
        Animated.spring(sheetHeight, { toValue: target, useNativeDriver: false, tension: 60, friction: 12 }).start();
      },
    }),
  ).current;

  const toggleSheet = () => {
    const target = isExpanded ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT;
    lastHeight.current = target;
    setIsExpanded(!isExpanded);
    Animated.spring(sheetHeight, { toValue: target, useNativeDriver: false, tension: 60, friction: 12 }).start();
  };

  const { liveTrip, liveStatus, liveLocation, lastLocationUpdateAt, applyTripSnapshot } = useTripRealtime(
    Number.isFinite(numericTripId) ? numericTripId : null,
    { initialTrip: trip },
  );

  const currentTrip = loadedTripId === id ? (liveTrip ?? trip) : null;
  const tripForRoute = routeLoad && currentTrip
    ? ({ ...currentTrip, load: { ...currentTrip.load, ...routeLoad } } as Trip)
    : currentTrip;
  const currentStatus = liveStatus ?? currentTrip?.status ?? 'aguardando_inicio';
  const isTripStarted = ['indo_carregar', 'chegou_origem', 'carregado', 'viagem_iniciada'].includes(currentStatus);
  const isHeadingToPickup = ['indo_carregar', 'chegou_origem'].includes(currentStatus);
  const shouldShareDriverLocation = isTripStarted;

  const {
    isSharing: isDriverLocationSharing,
    sharingStatus: driverLocationSharingStatus,
    permissionGranted: driverLocationPermissionGranted,
    lastSentAt: driverLocationLastSentAt,
    errorMessage: driverLocationError,
  } = useDriverTripLocationSharing({
    tripId: Number.isFinite(numericTripId) ? numericTripId : null,
    enabled: shouldShareDriverLocation,
  });
  // The backend is the source of truth for the trip position. This keeps the
  // driver and CargoLink maps in sync even when the driver's realtime socket
  // is temporarily disconnected.
  const savedLocation = normalizeTripLocations(locationHistory).at(-1) ?? null;
  const driverSavedLocation = getCoordinate(
    currentTrip?.driver?.current_lat ?? currentTrip?.vehicle?.current_lat,
    currentTrip?.driver?.current_lng ?? currentTrip?.vehicle?.current_lng,
  );
  const navigationLocation = liveLocation ?? savedLocation ?? driverSavedLocation;

  const showDialog = useCallback((title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setDialogProps({ title, message, type });
    setDialogVisible(true);
  }, []);

  const loadData = useCallback(
    async (silent = false) => {
      if (!id) return;
      const requestId = ++tripLoadRequestRef.current;
      try {
        if (!silent) setLoading(true);
        const [tripData, stopsData, locationsData] = await Promise.all([
          tripService.getTrip(id),
          tripService.getTripStops(id).catch(() => []),
          tripService.getTripLocations(id).catch(() => []),
        ]);
        if (requestId !== tripLoadRequestRef.current) return;
        setTrip(tripData);
        setLoadedTripId(id);
        setStops(stopsData);
        setLocationHistory(locationsData);
        applyTripSnapshot(tripData);
      } catch (error) {
        if (requestId !== tripLoadRequestRef.current) return;
        console.error('Failed to load trip details:', error);
        showDialog('Erro', 'Não foi possível carregar os detalhes da viagem.', 'error');
      } finally {
        if (requestId === tripLoadRequestRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [id, applyTripSnapshot, showDialog],
  );

  useEffect(() => {
    // Expo Router can reuse this screen when another trip is opened.
    // Clear the old map immediately instead of showing its route while loading.
    tripLoadRequestRef.current += 1;
    lastRerouteRef.current = null;
    setTrip(null);
    setLoadedTripId(null);
    setRouteLoad(null);
    setStops([]);
    setLocationHistory([]);
    setRoutePath([]);
    setRouteOptions([]);
    setRouteError(null);
    setCurrentPlace(null);
    setIsMapReady(false);
    setLoading(true);
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const loadId = currentTrip?.load_id ?? currentTrip?.load?.id;
    if (!loadId) {
      setRouteLoad(null);
      return;
    }
    let active = true;
    void loadService.getLoadById(loadId)
      .then((load) => {
        if (active) {
          lastRerouteRef.current = null;
          setRouteLoad(load);
        }
      })
      .catch(() => {
        // The trip summary remains a safe fallback if this endpoint is unavailable.
        if (active) setRouteLoad(null);
      });
    return () => {
      active = false;
    };
  }, [currentTrip?.load_id, currentTrip?.load?.id]);

  useEffect(() => {
    if (!currentTrip) return;
    // For the pickup phases, route to Origin; once the delivery trip starts, route to Destination.
    let active = true;
    const { origin, destination, originCoordinate, destinationCoordinate } = getTripRouteData(tripForRoute ?? currentTrip);
    const routeOrigin = isTripStarted && navigationLocation ? navigationLocation : originCoordinate;
    // When heading to pickup, target = origin; otherwise target = destination.
    const routeTarget = isHeadingToPickup ? originCoordinate : destinationCoordinate;
    const routeTargetLabel = isHeadingToPickup ? origin : destination;

    const loadGoogleRoute = async () => {
      try {
        setRouteLoading(true);
        const routes = await googleMapsService.getDrivingRouteSuggestions(
          getDirectionsEndpoint(routeOrigin, origin),
          getDirectionsEndpoint(routeTarget, routeTargetLabel),
        );
        if (!active) return;
        if (routes.length > 0) {
          setRouteError(null);
          setRouteOptions(routes);
          setRoutePath(routes[0].coordinates);
        } else {
          setRouteError('Nao foi encontrada uma rota por estrada para este destino.');
          setRouteOptions([]);
          setRoutePath([]);
        }
      } catch (error) {
        if (!active) return;
        console.error('Failed to load Google route:', error);
        setRouteError(error instanceof Error ? error.message : 'Falha ao carregar rota do Google.');
        setRouteOptions([]);
        setRoutePath([]);
      } finally {
        if (active) setRouteLoading(false);
      }
    };

    void loadGoogleRoute();
    return () => {
      active = false;
    };
  }, [currentTrip?.id, isTripStarted, isHeadingToPickup, liveLocation?.latitude, liveLocation?.longitude, routeLoad?.id]);

  useEffect(() => {
    if (!currentTrip || !isMapReady) return;
    const { originCoordinate, destinationCoordinate } = getTripRouteData(tripForRoute ?? currentTrip);
    const historyCoordinates = normalizeTripLocations(locationHistory);
    const liveMarker = isTripStarted ? navigationLocation : null;
    const traveledRouteCoordinates = buildTraveledRouteCoordinates(historyCoordinates, liveMarker);
    const currentCoordinate = navigationLocation ?? historyCoordinates[historyCoordinates.length - 1] ?? originCoordinate ?? destinationCoordinate;

    // 3D is the close navigation view. In 2D keep the complete route visible,
    // including the destination marker, just like CargoLink's route preview.
    if (isTripStarted && is3DMode && currentCoordinate) {
      const nextRoutePoint = routePath[Math.min(getNearestRouteIndex(currentCoordinate, routePath) + 1, routePath.length - 1)];
      mapRef.current?.animateCamera(
        {
          center: currentCoordinate,
          pitch: is3DMode ? NAVIGATION_CAMERA_PITCH : 0,
          heading: nextRoutePoint ? getBearing(currentCoordinate, nextRoutePoint) : 0,
          zoom: NAVIGATION_CAMERA_ZOOM + 200,
        },
        { duration: 850 },
      );
      return;
    }

    const coordinates =
      traveledRouteCoordinates.length > 1
        ? traveledRouteCoordinates
        : routePath.length > 1
          ? routePath
          : [originCoordinate, destinationCoordinate].filter((coordinate): coordinate is Coordinate => coordinate !== null);

    if (coordinates.length > 0) mapRef.current?.fitToCoordinates(coordinates, {
      edgePadding: { top: 90, right: 60, bottom: COLLAPSED_HEIGHT + 40, left: 60 },
      animated: true,
    });
  }, [is3DMode, isMapReady, isTripStarted, navigationLocation, locationHistory, routePath, currentTrip?.id, routeLoad?.id]);

  useEffect(() => {
    if (!id || !isTripStarted) return;
    // Fallback for when WebSocket events are delayed: reload the last position
    // that was actually persisted by the backend.
    const refreshBackendLocation = async () => {
      try {
        const locations = await tripService.getTripLocations(id);
        setLocationHistory(locations);
      } catch {
        // Keep the last confirmed backend position until the next retry.
      }
    };
    void refreshBackendLocation();
    const interval = setInterval(() => void refreshBackendLocation(), 12_000);
    return () => clearInterval(interval);
  }, [id, isTripStarted]);

  useEffect(() => {
    if (!currentTrip || !navigationLocation || !isTripStarted) return;

    const last = lastRerouteRef.current;
    const now = Date.now();
    if (
      last &&
      now - last.timestamp < REROUTE_MIN_INTERVAL_MS &&
      getDistanceKm(last.coordinate, navigationLocation) < REROUTE_DISTANCE_THRESHOLD_KM
    ) {
      return;
    }

    let active = true;
    const { destination, destinationCoordinate } = getTripRouteData(tripForRoute ?? currentTrip);

    const loadLiveRoute = async () => {
      try {
        setRouteLoading(true);
        const routes = await googleMapsService.getDrivingRouteSuggestions(
          navigationLocation,
          getDirectionsEndpoint(destinationCoordinate, destination),
        );
        if (!active) return;

        lastRerouteRef.current = { coordinate: navigationLocation, timestamp: now };
        if (routes.length > 0) {
          setRouteError(null);
          setRouteOptions(routes);
          setRoutePath(routes[0].coordinates);
        } else {
          setRouteError('Nao foi encontrada uma nova rota por estrada.');
        }
      } catch (error) {
        if (active) console.error('Failed to refresh live route:', error);
        if (active) setRouteError(error instanceof Error ? error.message : 'Falha ao recalcular rota do Google.');
      } finally {
        if (active) setRouteLoading(false);
      }
    };

    void loadLiveRoute();
    return () => {
      active = false;
    };
  }, [currentTrip?.id, isTripStarted, navigationLocation, locationHistory, routeLoad?.id]);

  useEffect(() => {
    if (!currentTrip) return;
    const historyCoordinates = normalizeTripLocations(locationHistory);
    const coordinate =
      navigationLocation ??
      historyCoordinates[historyCoordinates.length - 1] ??
      getTripRouteData(tripForRoute ?? currentTrip).originCoordinate;
    if (!coordinate) {
      setCurrentPlace(null);
      return;
    }
    let active = true;

    const loadCurrentPlace = async () => {
      try {
        setCurrentPlaceLoading(true);
        const place = await googleMapsService.reverseGeocodeMozambiqueCoordinate(coordinate);
        if (active) setCurrentPlace(place);
      } catch {
        if (active) setCurrentPlace(null);
      } finally {
        if (active) setCurrentPlaceLoading(false);
      }
    };

    void loadCurrentPlace();
    return () => {
      active = false;
    };
  }, [currentTrip?.id, navigationLocation?.latitude, navigationLocation?.longitude, locationHistory, routeLoad?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadData(true);
  };

  const handleStartPickup = async () => {
    if (!id) return;
    try {
      setStarting(true);
      const updated = await tripService.startPickupTrip(id);
      setTrip(updated);
      applyTripSnapshot(updated);
      showDialog('Indo Carregar', 'Iniciou o deslocamento para o local de carregamento. O mapa irá guiá-lo à Origem.', 'success');
    } catch (error) {
      console.error('Failed to start pickup trip:', error);
      showDialog('Erro', 'Não foi possível iniciar o deslocamento para coleta.', 'error');
    } finally {
      setStarting(false);
    }
  };

  const handleArrivePickup = async () => {
    if (!id) return;
    try {
      setStarting(true);
      const updated = await tripService.arrivePickupTrip(id);
      setTrip(updated);
      applyTripSnapshot(updated);
      showDialog('Chegou à Origem', 'Confirmou a chegada ao local de carregamento.', 'success');
    } catch (error) {
      console.error('Failed to confirm pickup arrival:', error);
      showDialog('Erro', 'Não foi possível confirmar a chegada ao carregamento.', 'error');
    } finally {
      setStarting(false);
    }
  };

  const handleConfirmLoaded = async () => {
    if (!id) return;
    try {
      setStarting(true);
      const updated = await tripService.confirmLoadedTrip(id);
      setTrip(updated);
      applyTripSnapshot(updated);
      showDialog('Carga Carregada', 'Confirmou o carregamento da carga no camião. Pode iniciar a viagem de entrega!', 'success');
    } catch (error) {
      console.error('Failed to confirm loaded:', error);
      showDialog('Erro', 'Não foi possível confirmar o carregamento.', 'error');
    } finally {
      setStarting(false);
    }
  };

  const handleStartTrip = async () => {
    if (!id) return;
    try {
      setStarting(true);
      const updated = await tripService.startTrip(id);
      setTrip(updated);
      applyTripSnapshot(updated);
      showDialog('Viagem iniciada', 'A viagem de entrega foi iniciada com sucesso. A localização será enviada automaticamente.', 'success');
    } catch (error) {
      console.error('Failed to start trip:', error);
      showDialog('Erro', 'Não foi possível iniciar a viagem de entrega.', 'error');
    } finally {
      setStarting(false);
    }
  };

  if (loading && !currentTrip) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={FretixColors.yellow} />
        <Text style={styles.loaderText}>A carregar viagem...</Text>
      </View>
    );
  }

  if (!currentTrip) {
    return (
      <View style={styles.loaderContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={FretixColors.grayLight} />
        <Text style={styles.loaderText}>Viagem não encontrada.</Text>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const load = currentTrip.load;
  const { origin, destination, loadTitle, originCoordinate, destinationCoordinate } = getTripRouteData(tripForRoute ?? currentTrip);
  const hasDrivingRoute = routePath.length > 1;
  // Keep the origin and destination connected in the normal map even while
  // Google is loading or unavailable; the dashed grey line is only a visual
  // fallback, never presented as a drivable instruction.
  const baseRouteCoordinates = hasDrivingRoute
    ? routePath
    : [originCoordinate, destinationCoordinate].filter((coordinate): coordinate is Coordinate => coordinate !== null);
  const routeCoordinates = ensureRouteEndsAtDestination(baseRouteCoordinates, destinationCoordinate);
  const historyCoordinates = normalizeTripLocations(locationHistory);
  const liveMarker = isTripStarted ? navigationLocation : null;
  const traveledRouteCoordinates = buildTraveledRouteCoordinates(historyCoordinates, liveMarker);
  const primaryRoute = routeOptions[0];
  const currentCoordinate =
    navigationLocation ?? historyCoordinates[historyCoordinates.length - 1] ?? originCoordinate ?? destinationCoordinate ?? DEFAULT_MAP_CENTER;
  const traveledRoadCoordinates = getTraveledRoadCoordinates(currentCoordinate, routeCoordinates, isTripStarted);
  const guidanceRoute = splitGuidanceRoute(currentCoordinate, routeCoordinates, isTripStarted);
  const nextStep = getNextNavigationStep(currentCoordinate, primaryRoute?.steps ?? []);
  const progress = getProgressValue(currentTrip);
  const canStartPickup = currentStatus === 'aguardando_inicio';
  const canArrivePickup = currentStatus === 'indo_carregar';
  const canConfirmLoaded = currentStatus === 'chegou_origem';
  const canStartDelivery = currentStatus === 'carregado';
  const distanceToDestination = navigationLocation && destinationCoordinate ? getDistanceKm(navigationLocation, destinationCoordinate) : null;
  const isNearDestination = distanceToDestination === null || distanceToDestination <= 0.02;
  const canArrive = currentStatus === 'viagem_iniciada';
  const showFooter = canStartPickup || canArrivePickup || canConfirmLoaded || canStartDelivery || currentStatus === 'viagem_iniciada';
  // For pickup phases point the map region towards origin; otherwise destination.
  const activeTarget = isHeadingToPickup ? originCoordinate : destinationCoordinate;
  const routeStartForRegion = originCoordinate ?? currentCoordinate;
  const routeEndForRegion = activeTarget ?? currentCoordinate;
  const initialLongitudeDelta = Math.max(Math.abs(routeStartForRegion.longitude - routeEndForRegion.longitude) * 1.4, 0.08);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable style={styles.headerBack} onPress={handleBack} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={FretixColors.white} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Detalhes da Viagem</Text>
            <Text style={styles.headerSub}>#{currentTrip.id} · {loadTitle}</Text>
          </View>
          <TripStatusBadge status={getTripStatus(currentStatus)} />
        </View>
      </SafeAreaView>

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          mapType="standard"
          customMapStyle={DARK_MAP_STYLE}
          pitchEnabled
          rotateEnabled
          showsBuildings
          showsCompass={false}
          initialRegion={{
            latitude: currentCoordinate.latitude,
            longitude: currentCoordinate.longitude,
            latitudeDelta: Math.max(Math.abs(routeStartForRegion.latitude - routeEndForRegion.latitude) * 1.4, 0.08),
            longitudeDelta: initialLongitudeDelta,
          }}
          onMapReady={() => setIsMapReady(true)}
          loadingEnabled
          loadingIndicatorColor={FretixColors.yellow}
        >
          {routeCoordinates.length > 1 ? (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="rgba(156,163,175,0.78)"
              strokeWidth={4}
              lineDashPattern={hasDrivingRoute ? undefined : [8, 6]}
              zIndex={1}
            />
          ) : null}
          {hasDrivingRoute && isTripStarted && guidanceRoute.preview.length > 1 ? (
            <Polyline
              coordinates={guidanceRoute.preview}
              strokeColor="#22C55E"
              strokeWidth={4}
              zIndex={3}
            />
          ) : null}
          {hasDrivingRoute && guidanceRoute.highlighted.length > 1 ? (
            <Polyline coordinates={guidanceRoute.highlighted} strokeColor="#FFC107" strokeWidth={7} zIndex={4} />
          ) : null}
          {traveledRoadCoordinates.length > 1 ? (
            <Polyline coordinates={traveledRoadCoordinates} strokeColor="rgba(148,163,184,0.55)" strokeWidth={4} zIndex={2} />
          ) : null}
          {originCoordinate ? <Marker coordinate={originCoordinate} title="Origem" description={origin} pinColor="#3B82F6" zIndex={5} /> : null}
          {destinationCoordinate ? <Marker coordinate={destinationCoordinate} title="Destino" description={destination} pinColor={FretixColors.yellow} zIndex={6} /> : null}
          {liveMarker ? (
            <Marker coordinate={liveMarker} title="Localização atual">
              <View style={styles.driverMarker}>
                <Ionicons name="navigate" size={18} color="#0B0F14" />
              </View>
            </Marker>
          ) : null}
        </MapView>

        {isTripStarted ? (
          <View style={styles.navigationCard} pointerEvents="none">
            <View style={styles.navigationIcon}>
              <Ionicons name="navigate" size={22} color="#0B0F14" />
            </View>
            <View style={styles.navigationTexts}>
              <Text style={styles.navigationDistance}>
                {nextStep
                  ? `${nextStep.distanceKm < 1 ? Math.round(nextStep.distanceKm * 1000) : nextStep.distanceKm.toFixed(1)} ${nextStep.distanceKm < 1 ? 'm' : 'km'}`
                  : 'A guiar'}
              </Text>
              <Text style={styles.navigationInstruction} numberOfLines={2}>
                {nextStep?.instruction ?? `Siga para ${destination}`}
              </Text>
            </View>
          </View>
        ) : null}

        {routeLoading || primaryRoute ? (
          <View style={styles.routeBadge} pointerEvents="none">
            {routeLoading ? (
              <ActivityIndicator size="small" color={FretixColors.yellow} />
            ) : (
              <Ionicons name="navigate" size={15} color={FretixColors.yellow} />
            )}
            <Text style={styles.routeBadgeText}>
              {routeLoading
                ? 'A calcular rota...'
                : `${primaryRoute?.distanceText ?? '—'} · ${primaryRoute?.durationText ?? '—'}`}
            </Text>
          </View>
        ) : null}

        <View style={styles.floatingMapControls} pointerEvents="box-none">
          <Pressable
            onPress={() => {
              mapRef.current?.animateCamera(
                {
                  center: currentCoordinate,
                  heading: 0,
                  pitch: is3DMode ? NAVIGATION_CAMERA_PITCH : 0,
                  zoom: isTripStarted ? NAVIGATION_CAMERA_ZOOM : undefined,
                },
                { duration: 650 },
              );
            }}
            style={styles.compassButton}
          >
            <Ionicons name="compass-outline" size={22} color={FretixColors.yellow} />
            <Text style={styles.compassText}>N</Text>
          </Pressable>
          <Pressable
            onPress={() => setIs3DMode((v) => !v)}
            style={[styles.mapModeButton, is3DMode && styles.mapModeButtonActive]}
          >
            <Ionicons name={is3DMode ? 'cube' : 'cube-outline'} size={18} color={is3DMode ? '#101217' : FretixColors.yellow} />
            <Text style={[styles.mapModeButtonText, is3DMode && styles.mapModeButtonTextActive]}>
              {is3DMode ? '3D' : '2D'}
            </Text>
          </Pressable>
        </View>
      </View>

      <Animated.View style={[styles.sheet, { height: sheetHeight }]}>
        <View {...panResponder.panHandlers} style={styles.handleArea}>
          <View style={styles.handle} />
        </View>

        <Pressable onPress={toggleSheet} style={styles.summary}>
          <View style={styles.summaryRoute}>
            <View style={styles.summaryLoc}>
              <Ionicons name="location" size={15} color="#3B82F6" />
              <Text style={styles.summaryLocText} numberOfLines={1}>{origin}</Text>
            </View>
            <Ionicons name="arrow-forward" size={14} color={FretixColors.yellow} />
            <View style={styles.summaryLoc}>
              <Ionicons name="flag" size={15} color={FretixColors.yellow} />
              <Text style={styles.summaryLocText} numberOfLines={1}>{destination}</Text>
            </View>
          </View>
          <View style={styles.summaryMeta}>
            <View>
              <Text style={styles.metaLabel}>Saída</Text>
              <Text style={styles.metaValue}>{formatDate(load?.departure_date ?? currentTrip.departure_date ?? currentTrip.created_at)}</Text>
            </View>
            <View>
              <Text style={styles.metaLabel}>Estado</Text>
              <Text style={styles.metaValue}>{getTripStatusLabel(currentStatus)}</Text>
            </View>
            <View style={styles.expandHint}>
              <Ionicons name={isExpanded ? 'chevron-down' : 'chevron-up'} size={18} color={FretixColors.yellow} />
            </View>
          </View>
        </Pressable>

        <ScrollView
          style={styles.detailsScroll}
          contentContainerStyle={[styles.detailsContent, showFooter && { paddingBottom: FOOTER_HEIGHT + 24 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={FretixColors.yellow} colors={[FretixColors.yellow]} />
          }
          showsVerticalScrollIndicator={false}
          scrollEnabled={isExpanded}
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Progresso da Viagem</Text>
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            </View>
            <View style={styles.metricsRow}>
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>Distância total</Text>
                <Text style={styles.metricValue}>{formatDistance(currentTrip.total_distance_km)}</Text>
              </View>
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>Percorrida</Text>
                <Text style={styles.metricValue}>{formatDistance(currentTrip.traveled_distance_km)}</Text>
              </View>
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>Tempo estimado</Text>
                <Text style={styles.metricValue}>{currentTrip.estimated_time || '—'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Rota do Transporte</Text>
            {primaryRoute ? (
              <View style={styles.routeSuggestion}>
                <Ionicons name="sparkles" size={16} color={FretixColors.yellow} />
                <Text style={styles.routeSuggestionText}>
                  Google Maps: {primaryRoute.summary || 'rota sugerida'} · {primaryRoute.distanceText} · {primaryRoute.durationText}
                </Text>
              </View>
            ) : null}
            {routeError ? (
              <View style={styles.routeWarning}>
                <Ionicons name="warning-outline" size={16} color="#FCA5A5" />
                <Text style={styles.routeWarningText}>
                  Rota por estrada indisponivel. A linha reta aparece apenas como referencia.
                </Text>
              </View>
            ) : null}

            <View style={styles.realtimeSharingPanel}>
              <View style={styles.realtimeSharingHeader}>
                <Ionicons
                  name={isDriverLocationSharing ? 'radio' : 'radio-outline'}
                  size={16}
                  color={isDriverLocationSharing ? '#22C55E' : FretixColors.yellow}
                />
                <Text style={styles.realtimeSharingTitle}>Partilha de localização</Text>
              </View>
              <Text style={styles.realtimeSharingText}>
                {shouldShareDriverLocation
                  ? isDriverLocationSharing
                    ? 'A localização é enviada ao servidor a cada 10 segundos quando a posição muda.'
                    : driverLocationSharingStatus === 'requesting_permission'
                      ? 'A solicitar permissão de localização...'
                      : driverLocationSharingStatus === 'error'
                        ? driverLocationError ?? 'Erro ao iniciar o rastreamento.'
                        : 'A iniciar o rastreamento...'
                  : 'O envio automático é ativado quando a viagem estiver em andamento.'}
              </Text>
              {driverLocationLastSentAt ? (
                <Text style={styles.realtimeSharingMeta}>
                  Último envio ao servidor: {formatDateTime(driverLocationLastSentAt)}
                </Text>
              ) : null}
              {shouldShareDriverLocation && !driverLocationPermissionGranted && driverLocationSharingStatus === 'error' ? (
                <Text style={styles.realtimeSharingWarning}>
                  Sem permissão, a empresa e o cliente não receberão a sua posição em tempo real.
                </Text>
              ) : null}
            </View>

            <View style={styles.currentLocationPanel}>
              <View style={styles.currentLocationHeader}>
                <View style={styles.currentLocationIcon}>
                  <Ionicons name="navigate" size={16} color="#101217" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.currentLocationTitle}>
                    {liveLocation ? 'Localização atual em tempo real' : 'Localização estimada'}
                  </Text>
                  <Text style={styles.currentLocationSubtitle}>
                    {currentPlaceLoading
                      ? 'A identificar província, cidade e bairro...'
                      : currentPlace?.name ?? (liveLocation ? 'Posição enviada pelo motorista' : 'Ponto de origem')}
                  </Text>
                </View>
              </View>
              <View style={styles.locationGrid}>
                <View style={styles.locationCell}>
                  <Text style={styles.locationLabel}>Província</Text>
                  <Text style={styles.locationValue} numberOfLines={1}>{currentPlace?.province ?? '—'}</Text>
                </View>
                <View style={styles.locationCell}>
                  <Text style={styles.locationLabel}>Cidade/Distrito</Text>
                  <Text style={styles.locationValue} numberOfLines={1}>{currentPlace?.city ?? currentPlace?.district ?? '—'}</Text>
                </View>
                <View style={styles.locationCell}>
                  <Text style={styles.locationLabel}>Bairro/Zona</Text>
                  <Text style={styles.locationValue} numberOfLines={1}>{currentPlace?.neighborhood ?? '—'}</Text>
                </View>
                <View style={styles.locationCell}>
                  <Text style={styles.locationLabel}>Coordenadas</Text>
                  <Text style={styles.locationValue} numberOfLines={1}>{formatCoordinate(currentCoordinate)}</Text>
                </View>
              </View>
              {lastLocationUpdateAt ? (
                <Text style={styles.currentLocationUpdatedAt}>
                  Atualizado em tempo real: {formatDateTime(lastLocationUpdateAt)}
                </Text>
              ) : null}
            </View>

            <View style={styles.routeContainer}>
              <View style={styles.routeMarkerCol}>
                <View style={styles.dotBlue} />
                <View style={styles.routeLine} />
                <View style={styles.dotYellow} />
              </View>
              <View style={styles.routeTextCol}>
                <View>
                  <Text style={styles.routeLabel}>Origem</Text>
                  <Text style={styles.routeValue}>{origin}</Text>
                </View>
                <View style={{ marginTop: 18 }}>
                  <Text style={styles.routeLabel}>Destino</Text>
                  <Text style={styles.routeValue}>{destination}</Text>
                </View>
              </View>
            </View>
          </View>

          {load ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Detalhes da Carga</Text>
              <View style={styles.rowInfo}>
                <LoadTypeImage loadType={load.load_type} style={styles.loadImg} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoName}>{load.load_name || `Carga de ${load.load_type}`}</Text>
                  {load.code ? <Text style={styles.infoSub}>Código: {load.code}</Text> : null}
                  {load.weight != null ? (
                    <Text style={styles.infoSub}>Peso: {load.weight} {load.weight_unit || 'kg'}</Text>
                  ) : null}
                </View>
                <View style={styles.priceWrap}>
                  <Text style={styles.priceText}>{formatCurrency(load.value)}</Text>
                  {load.negotiable ? <Text style={styles.negotiable}>Negociável</Text> : null}
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cliente</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoRowLabel}>Nome</Text>
              <Text style={styles.infoRowValue}>{currentTrip.client_name || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoRowLabel}>Telefone</Text>
              <Text style={styles.infoRowValue}>{currentTrip.client_phone || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoRowLabel}>Iniciada em</Text>
              <Text style={styles.infoRowValue}>{formatDateTime(currentTrip.started_at)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoRowLabel}>Chegada</Text>
              <Text style={styles.infoRowValue}>{formatDateTime(currentTrip.arrived_at)}</Text>
            </View>
          </View>

          {(currentTrip.driver || currentTrip.vehicle) && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Motorista e Veículo</Text>
              {currentTrip.driver ? (
                <View style={styles.rowInfo}>
                  <Image
                    source={
                      currentTrip.driver.profile_photo
                        ? { uri: resolveMediaUrl(currentTrip.driver.profile_photo) ?? undefined }
                        : require('@/assets/images/splash-icon.png')
                    }
                    style={styles.avatar}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoName}>{currentTrip.driver.name || 'Motorista'}</Text>
                    {currentTrip.driver.phone ? <Text style={styles.infoSub}>Tel: {currentTrip.driver.phone}</Text> : null}
                  </View>
                </View>
              ) : null}
              {currentTrip.driver && currentTrip.vehicle ? <View style={styles.sep} /> : null}
              {currentTrip.vehicle ? (
                <View style={styles.rowInfo}>
                  <Image
                    source={
                      currentTrip.vehicle.photo
                        ? { uri: resolveMediaUrl(currentTrip.vehicle.photo) ?? undefined }
                        : require('@/assets/images/splash-icon.png')
                    }
                    style={styles.vehicleImg}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoName}>
                      {[currentTrip.vehicle.brand, currentTrip.vehicle.model_name].filter(Boolean).join(' ') || 'Caminhão'}
                    </Text>
                    <Text style={styles.infoPlate}>{currentTrip.vehicle.plate}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Paradas</Text>
              <Pressable
                onPress={() =>
                  pushWithReturnTo('/trip_stops', { id: currentTrip.id }, buildReturnTo('/trip_details', { id: currentTrip.id, returnTo }))
                }
              >
                <Text style={styles.linkText}>Ver todas</Text>
              </Pressable>
            </View>
            {stops.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma parada registrada ainda.</Text>
            ) : (
              stops.slice(0, 3).map((stop) => (
                <View key={stop.id} style={styles.stopRow}>
                  <Ionicons name="pause-circle-outline" size={18} color={FretixColors.yellow} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stopTitle}>{stop.location_name || stop.address || stop.stop_type}</Text>
                    <Text style={styles.stopSub}>{stop.stop_type} · {formatDateTime(stop.stopped_at)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* ── Activity Timeline ── */}
          {currentTrip.activities && currentTrip.activities.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Atividades da Viagem</Text>
              {currentTrip.activities.map((act, index) => {
                const isLast = index === currentTrip.activities!.length - 1;
                return (
                  <View key={act.id} style={styles.activityRow}>
                    <View style={styles.activityTimelineCol}>
                      <View style={[styles.activityDot, isLast && styles.activityDotActive]} />
                      {!isLast ? <View style={styles.activityLine} /> : null}
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>{act.title}</Text>
                      {act.description ? (
                        <Text style={styles.activityDesc}>{act.description}</Text>
                      ) : null}
                      <Text style={styles.activityTime}>{formatDateTime(act.created_at)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
        </ScrollView>

        {showFooter ? (
          <View style={styles.footer}>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() =>
                pushWithReturnTo('/trip_stops', { id: currentTrip.id }, buildReturnTo('/trip_details', { id: currentTrip.id, returnTo }))
              }
            >
              <Ionicons name="add-circle-outline" size={18} color={FretixColors.white} />
              <Text style={styles.secondaryBtnText}>Parada</Text>
            </Pressable>

            {/* Step 1: Ir buscar a carga */}
            {canStartPickup ? (
              <Pressable style={[styles.primaryBtn]} onPress={handleStartPickup} disabled={starting}>
                {starting ? (
                  <ActivityIndicator color="#101217" />
                ) : (
                  <>
                    <Ionicons name="navigate" size={18} color="#101217" />
                    <Text style={styles.primaryBtnText}>Indo Carregar</Text>
                  </>
                )}
              </Pressable>
            ) : null}

            {/* Step 2: Confirmação de chegada à origem */}
            {canArrivePickup ? (
              <Pressable style={[styles.primaryBtn]} onPress={handleArrivePickup} disabled={starting}>
                {starting ? (
                  <ActivityIndicator color="#101217" />
                ) : (
                  <>
                    <Ionicons name="location" size={18} color="#fff" />
                    <Text style={[styles.primaryBtnText, { color: '#fff' }]}>Cheguei à Origem</Text>
                  </>
                )}
              </Pressable>
            ) : null}

            {/* Step 3: Confirmar carregamento */}
            {canConfirmLoaded ? (
              <Pressable style={[styles.primaryBtn, styles.primaryBtnLoaded]} onPress={handleConfirmLoaded} disabled={starting}>
                {starting ? (
                  <ActivityIndicator color="#101217" />
                ) : (
                  <>
                    <Ionicons name="cube" size={18} color="#101217" />
                    <Text style={styles.primaryBtnText}>Confirmar Carregamento</Text>
                  </>
                )}
              </Pressable>
            ) : null}

            {/* Step 4: Iniciar viagem de entrega */}
            {canStartDelivery ? (
              <Pressable style={styles.primaryBtn} onPress={handleStartTrip} disabled={starting}>
                {starting ? (
                  <ActivityIndicator color="#101217" />
                ) : (
                  <>
                    <Ionicons name="play" size={18} color="#101217" />
                    <Text style={styles.primaryBtnText}>Iniciar Entrega</Text>
                  </>
                )}
              </Pressable>
            ) : null}

            {/* Step 5: Chegada ao destino */}
            {canArrive ? (
              <Pressable
                style={styles.primaryBtn}
                onPress={() =>
                  pushWithReturnTo(
                    '/trip_arrival_confirm',
                    { id: currentTrip.id },
                    buildReturnTo('/trip_details', { id: currentTrip.id, returnTo }),
                  )
                }
              >
                <Ionicons name="flag" size={18} color="#101217" />
                <Text style={styles.primaryBtnText}>Confirmar Chegada</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </Animated.View>

      <CustomDialog
        visible={dialogVisible}
        title={dialogProps.title}
        message={dialogProps.message}
        type={dialogProps.type}
        onConfirm={() => setDialogVisible(false)}
        onCancel={() => setDialogVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F14' },
  loaderContainer: {
    flex: 1,
    backgroundColor: FretixColors.black,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: { color: FretixColors.grayLight, fontSize: 14 },
  backBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: FretixColors.yellow,
  },
  backBtnText: { color: FretixColors.yellow, fontSize: 14, fontWeight: '600' },
  headerSafe: { zIndex: 20, elevation: 20, backgroundColor: '#0B0F14' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: 'rgba(11,15,20,0.96)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerBack: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  headerCenter: { flex: 1 },
  headerTitle: { color: FretixColors.white, fontSize: 15, fontWeight: '700' },
  headerSub: { color: '#8D949E', fontSize: 12, marginTop: 1 },
  mapWrap: { flex: 1, position: 'relative' },
  navigationCard: {
    position: 'absolute',
    top: 12,
    left: 14,
    right: 14,
    zIndex: 10,
    elevation: 10,
    minHeight: 74,
    borderRadius: 18,
    backgroundColor: 'rgba(7,10,14,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.28)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navigationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: FretixColors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationTexts: { flex: 1 },
  navigationDistance: { color: FretixColors.yellow, fontSize: 13, fontWeight: '900', marginBottom: 3 },
  navigationInstruction: { color: FretixColors.white, fontSize: 16, fontWeight: '800', lineHeight: 20 },
  driverMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#22C55E',
    borderWidth: 3,
    borderColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationPlaceLabel: {
    maxWidth: 145,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.75)',
  },
  destinationMarkerLabel: {
    maxWidth: 190,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: FretixColors.yellow,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  destinationMarkerLabelText: {
    flexShrink: 1,
    color: '#0B0F14',
    fontSize: 11,
    fontWeight: '800',
  },
  destinationPlaceLabelText: {
    flexShrink: 1,
    color: '#0B0F14',
    fontSize: 10,
    fontWeight: '700',
  },
  routeBadge: {
    position: 'absolute',
    top: 94,
    alignSelf: 'center',
    zIndex: 9,
    elevation: 9,
    minHeight: 34,
    maxWidth: '86%',
    borderRadius: 17,
    backgroundColor: 'rgba(11,15,20,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.35)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeBadgeText: { color: FretixColors.white, fontSize: 12, fontWeight: '700' },
  floatingMapControls: {
    position: 'absolute',
    bottom: COLLAPSED_HEIGHT + 14,
    right: 16,
    zIndex: 9,
    elevation: 9,
    alignItems: 'center',
    gap: 10,
  },
  compassButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(11,15,20,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassText: { position: 'absolute', top: 4, color: FretixColors.yellow, fontSize: 9, fontWeight: '900' },
  mapModeButton: {
    minWidth: 62,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(11,15,20,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.38)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mapModeButtonActive: { backgroundColor: FretixColors.yellow, borderColor: FretixColors.yellow },
  mapModeButtonText: { color: FretixColors.yellow, fontSize: 12, fontWeight: '800' },
  mapModeButtonTextActive: { color: '#101217' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 15,
    elevation: 15,
    backgroundColor: '#0E1621',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  handleArea: { alignItems: 'center', paddingVertical: 10 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  summary: { paddingHorizontal: 20, paddingBottom: 14, gap: 12 },
  summaryRoute: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryLoc: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  summaryLocText: { flex: 1, color: FretixColors.white, fontSize: 13, fontWeight: '600' },
  summaryMeta: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  metaLabel: { color: '#6B7280', fontSize: 11 },
  metaValue: { color: FretixColors.white, fontSize: 13, fontWeight: '700', marginTop: 2 },
  expandHint: { marginLeft: 'auto' },
  detailsScroll: { flex: 1 },
  detailsContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    color: FretixColors.white,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.6,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTrack: { flex: 1, height: 8, borderRadius: 999, backgroundColor: '#1E293B', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: FretixColors.yellow },
  progressText: { color: FretixColors.yellow, fontSize: 13, fontWeight: '700', minWidth: 36 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricCell: {
    flexBasis: '30%',
    flexGrow: 1,
    borderRadius: 10,
    backgroundColor: 'rgba(11,15,20,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 10,
    gap: 4,
  },
  metricLabel: { color: '#8D949E', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  metricValue: { color: FretixColors.white, fontSize: 13, fontWeight: '700' },
  routeSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,193,7,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  routeSuggestionText: { flex: 1, color: FretixColors.white, fontSize: 12, fontWeight: '600' },
  routeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  routeWarningText: { flex: 1, color: '#FECACA', fontSize: 12, fontWeight: '700', lineHeight: 16 },
  realtimeSharingPanel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(17,24,36,0.65)',
    padding: 12,
    gap: 6,
  },
  realtimeSharingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  realtimeSharingTitle: { color: FretixColors.white, fontSize: 13, fontWeight: '700' },
  realtimeSharingText: { color: '#C9D1D9', fontSize: 12, lineHeight: 18 },
  realtimeSharingMeta: { color: '#93C5FD', fontSize: 11, fontWeight: '700' },
  realtimeSharingWarning: { color: '#FCA5A5', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  currentLocationPanel: {
    gap: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(59,130,246,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.24)',
    padding: 12,
  },
  currentLocationHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  currentLocationIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: FretixColors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationTitle: { color: FretixColors.white, fontSize: 13, fontWeight: '800' },
  currentLocationSubtitle: { color: '#AAB2BE', fontSize: 12, marginTop: 2 },
  locationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  locationCell: {
    width: '48%',
    minHeight: 50,
    borderRadius: 10,
    backgroundColor: 'rgba(11,15,20,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  locationLabel: { color: '#8D949E', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  locationValue: { color: FretixColors.white, fontSize: 12, fontWeight: '700', marginTop: 3 },
  currentLocationUpdatedAt: { color: FretixColors.yellow, fontSize: 11, fontWeight: '700' },
  routeContainer: { flexDirection: 'row', gap: 12 },
  routeMarkerCol: { alignItems: 'center', paddingTop: 4 },
  dotBlue: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3B82F6' },
  routeLine: { flex: 1, width: 2, backgroundColor: '#374151', marginVertical: 4, minHeight: 28 },
  dotYellow: { width: 10, height: 10, borderRadius: 5, backgroundColor: FretixColors.yellow },
  routeTextCol: { flex: 1 },
  routeLabel: { color: '#8D949E', fontSize: 11 },
  routeValue: { color: FretixColors.white, fontSize: 14, fontWeight: '600', marginTop: 2 },
  rowInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loadImg: { width: 46, height: 46, borderRadius: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#0D1118' },
  vehicleImg: { width: 56, height: 46, borderRadius: 10, backgroundColor: '#0D1118' },
  infoName: { color: FretixColors.white, fontSize: 14, fontWeight: '700' },
  infoSub: { color: '#8D949E', fontSize: 12, marginTop: 2 },
  infoPlate: { color: FretixColors.yellow, fontSize: 12, fontWeight: '700', marginTop: 2 },
  priceWrap: { alignItems: 'flex-end' },
  priceText: { color: FretixColors.white, fontSize: 14, fontWeight: '700' },
  negotiable: { color: FretixColors.yellow, fontSize: 10, fontWeight: '600', marginTop: 2 },
  sep: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  infoRowLabel: { color: '#8D949E', fontSize: 13 },
  infoRowValue: { color: FretixColors.white, fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  linkText: { color: FretixColors.yellow, fontSize: 13, fontWeight: '700' },
  emptyText: { color: FretixColors.grayLight, fontSize: 13 },
  stopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stopTitle: { color: FretixColors.white, fontSize: 14, fontWeight: '700' },
  stopSub: { color: '#8D949E', fontSize: 12, marginTop: 2 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: '#0E1621',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  primaryBtn: {
    minHeight: 50,
    backgroundColor: FretixColors.yellow,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 2,
  },
  primaryBtnText: { color: '#101217', fontSize: 15, fontWeight: '700' },
  primaryBtnPickup: {
    backgroundColor: '#8B5CF6',
  },
  primaryBtnArrive: {
    backgroundColor: '#EC4899',
  },
  primaryBtnLoaded: {
    backgroundColor: '#10B981',
  },
  secondaryBtn: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
  },
  secondaryBtnText: { color: FretixColors.white, fontSize: 15, fontWeight: '700' },
  // Activity Timeline
  activityRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
  },
  activityTimelineCol: {
    alignItems: 'center',
    width: 16,
    paddingTop: 3,
  },
  activityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  activityDotActive: {
    backgroundColor: FretixColors.yellow,
    borderColor: FretixColors.yellow,
  },
  activityLine: {
    flex: 1,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: 4,
    marginBottom: 4,
    minHeight: 20,
  },
  activityContent: {
    flex: 1,
    paddingBottom: 18,
  },
  activityTitle: {
    color: FretixColors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  activityDesc: {
    color: '#8D949E',
    fontSize: 12,
    marginTop: 2,
  },
  activityTime: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 4,
  },
});
