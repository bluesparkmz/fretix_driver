import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomDialog } from '@/components/custom-dialog';
import { TripStatusBadge, type LoadStatusType } from '@/components/trip-status-indicator';
import { BottomTabInset, FretixColors } from '@/constants/theme';
import { useDriverTripLocationSharing } from '@/hooks/useDriverTripLocationSharing';
import { useTripRealtime } from '@/hooks/useTripRealtime';
import { googleMapsService, type GoogleRouteSuggestion, type MapCoordinate } from '@/services/google-maps';
import { tripService, type Trip, type TripLocation, type TripStop } from '@/services/trips';
import { buildReturnTo, goBackSmart, pushWithReturnTo, useSmartBackHandler } from '@/utils/navigation';

type Coordinate = MapCoordinate;

function toCoordinateNumber(value: number | string | null | undefined, fallback: number) {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : value;
  return Number.isFinite(parsed) ? Number(parsed) : fallback;
}

function getTripStatus(status: string): LoadStatusType {
  switch (status) {
    case 'viagem_iniciada':
      return 'em_viagem';
    case 'aguardando_cliente':
      return 'em_andamento';
    case 'concluida':
      return 'concluido';
    case 'cancelado':
      return 'cancelado';
    case 'aguardando_inicio':
    default:
      return 'em_andamento';
  }
}

function getTripStatusLabel(status: string) {
  switch (status) {
    case 'aguardando_inicio':
      return 'Aguardando início';
    case 'viagem_iniciada':
      return 'Viagem em andamento';
    case 'aguardando_cliente':
      return 'Aguardando cliente';
    case 'concluida':
      return 'Concluída';
    case 'cancelado':
      return 'Cancelada';
    default:
      return status.replace(/_/g, ' ');
  }
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDistance(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(1)} km`;
}

function getRouteCoordinates(trip: Trip, routeOptions: GoogleRouteSuggestion[]): Coordinate[] {
  if (routeOptions[0]?.coordinates?.length) return routeOptions[0].coordinates;

  return [
    {
      latitude: toCoordinateNumber(trip.origin_lat ?? trip.load?.origin_lat, -25.9692),
      longitude: toCoordinateNumber(trip.origin_lng ?? trip.load?.origin_lng, 32.5732),
    },
    {
      latitude: toCoordinateNumber(trip.destination_lat ?? trip.load?.destination_lat, -18.148),
      longitude: toCoordinateNumber(trip.destination_lng ?? trip.load?.destination_lng, 35.5873),
    },
  ];
}

function coordinatesMatch(a: Coordinate, b: Coordinate) {
  return Math.abs(a.latitude - b.latitude) < 0.00001 && Math.abs(a.longitude - b.longitude) < 0.00001;
}

function normalizeTripLocations(locations: TripLocation[]): Coordinate[] {
  return locations
    .map((location) => ({ latitude: location.latitude, longitude: location.longitude }))
    .filter(
      (coordinate, index, all) =>
        index === 0 || !coordinatesMatch(coordinate, all[index - 1]),
    );
}

function buildLiveRouteCoordinates(
  routeCoordinates: Coordinate[],
  historyCoordinates: Coordinate[],
  liveCoordinate: Coordinate | null,
) {
  const combined = historyCoordinates.length > 0 ? [...historyCoordinates] : [...routeCoordinates];

  if (liveCoordinate) {
    const lastCoordinate = combined[combined.length - 1];
    if (!lastCoordinate || !coordinatesMatch(lastCoordinate, liveCoordinate)) {
      combined.push(liveCoordinate);
    }
  }

  return combined;
}

function getProgressValue(trip: Trip) {
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
  if (trip.status === 'viagem_iniciada') return 35;
  return 0;
}

export default function TripDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string; returnTo?: string | string[]; from?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const from = Array.isArray(params.from) ? params.from[0] : params.from;
  const numericTripId = id ? Number.parseInt(id, 10) : null;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [stops, setStops] = useState<TripStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeOptions, setRouteOptions] = useState<GoogleRouteSuggestion[]>([]);
  const [locationHistory, setLocationHistory] = useState<TripLocation[]>([]);
  const [hasAutoFocusedLiveLocation, setHasAutoFocusedLiveLocation] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogProps, setDialogProps] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info',
  });

  const mapRef = useRef<MapView | null>(null);
  useSmartBackHandler({ returnTo, from, fallback: '/trips' });

  const { liveTrip, liveStatus, liveLocation, lastLocationUpdateAt, applyTripSnapshot } = useTripRealtime(
    Number.isFinite(numericTripId) ? numericTripId : null,
    { initialTrip: trip },
  );

  const activeTrip = liveTrip ?? trip;
  const shouldShareDriverLocation = (liveStatus ?? trip?.status) === 'viagem_iniciada';
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

  const showDialog = useCallback((title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setDialogProps({ title, message, type });
    setDialogVisible(true);
  }, []);

  const loadData = useCallback(async (silent = false) => {
    if (!id) return;

    try {
      if (!silent) setLoading(true);
      const [tripData, stopsData, locationsData] = await Promise.all([
        tripService.getTrip(id),
        tripService.getTripStops(id).catch(() => []),
        tripService.getTripLocations(id).catch(() => []),
      ]);
      setTrip(tripData);
      setStops(stopsData);
      setLocationHistory(locationsData);
      applyTripSnapshot(tripData);
    } catch (error) {
      console.error('Failed to load trip details:', error);
      showDialog('Erro', 'Não foi possível carregar os detalhes da viagem.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, applyTripSnapshot, showDialog]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!activeTrip) return;

    let mounted = true;
    const origin = {
      latitude: toCoordinateNumber(activeTrip.origin_lat ?? activeTrip.load?.origin_lat, -25.9692),
      longitude: toCoordinateNumber(activeTrip.origin_lng ?? activeTrip.load?.origin_lng, 32.5732),
    };
    const destination = {
      latitude: toCoordinateNumber(activeTrip.destination_lat ?? activeTrip.load?.destination_lat, -18.148),
      longitude: toCoordinateNumber(activeTrip.destination_lng ?? activeTrip.load?.destination_lng, 35.5873),
    };

    const loadRoute = async () => {
      try {
        setRouteLoading(true);
        const routes = await googleMapsService.getDrivingRouteSuggestions(origin, destination);
        if (!mounted) return;
        setRouteOptions(routes);
      } catch (error) {
        if (!mounted) return;
        console.error('Failed to load trip route:', error);
        setRouteOptions([]);
      } finally {
        if (mounted) setRouteLoading(false);
      }
    };

    void loadRoute();
    return () => {
      mounted = false;
    };
  }, [activeTrip?.id, activeTrip?.origin_lat, activeTrip?.origin_lng, activeTrip?.destination_lat, activeTrip?.destination_lng]);

  const routeCoordinates = activeTrip ? getRouteCoordinates(activeTrip, routeOptions) : [];
  const historyCoordinates = normalizeTripLocations(locationHistory);
  const liveMarker = liveLocation ?? null;
  const liveRouteCoordinates = buildLiveRouteCoordinates(routeCoordinates, historyCoordinates, liveMarker);

  useEffect(() => {
    if (!activeTrip) return;
    const coordinatesToFit = liveRouteCoordinates.length > 1 ? liveRouteCoordinates : routeCoordinates;
    if (coordinatesToFit.length < 2) return;

    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coordinatesToFit, {
        edgePadding: { top: 70, right: 50, bottom: 140, left: 50 },
        animated: true,
      });
      setHasAutoFocusedLiveLocation(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [activeTrip?.id, liveRouteCoordinates, routeCoordinates]);

  useEffect(() => {
    if (!liveLocation) return;

    setLocationHistory((current) => {
      const nextLocation: TripLocation = {
        id: Number(Date.now()),
        trip_id: Number.isFinite(numericTripId) ? Number(numericTripId) : 0,
        latitude: liveLocation.latitude,
        longitude: liveLocation.longitude,
        speed: null,
        created_at: lastLocationUpdateAt ?? new Date().toISOString(),
      };

      const previous = current[current.length - 1];
      if (
        previous &&
        coordinatesMatch(
          { latitude: previous.latitude, longitude: previous.longitude },
          liveLocation,
        )
      ) {
        return current;
      }

      return [...current, nextLocation];
    });

    if (!mapRef.current) return;
    if (hasAutoFocusedLiveLocation) return;

    mapRef.current.animateToRegion(
      {
        latitude: liveLocation.latitude,
        longitude: liveLocation.longitude,
        latitudeDelta: 0.22,
        longitudeDelta: 0.22,
      },
      700,
    );
    setHasAutoFocusedLiveLocation(true);
  }, [hasAutoFocusedLiveLocation, lastLocationUpdateAt, liveLocation, numericTripId]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadData(true);
  };

  const handleStartTrip = async () => {
    if (!id) return;
    try {
      setStarting(true);
      const updatedTrip = await tripService.startTrip(id);
      setTrip(updatedTrip);
      applyTripSnapshot(updatedTrip);
      showDialog('Viagem iniciada', 'A viagem foi iniciada com sucesso.', 'success');
    } catch (error) {
      console.error('Failed to start trip:', error);
      showDialog('Erro', 'Não foi possível iniciar a viagem.', 'error');
    } finally {
      setStarting(false);
    }
  };

  if (loading && !activeTrip) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={FretixColors.yellow} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!activeTrip) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Viagem não encontrada</Text>
            <Pressable style={styles.secondaryButton} onPress={() => goBackSmart({ returnTo, from, fallback: '/trips' })}>
              <Text style={styles.secondaryButtonText}>Voltar</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const progress = getProgressValue(activeTrip);
  const currentStatus = liveStatus ?? activeTrip.status;
  const canStart = currentStatus === 'aguardando_inicio';
  const canArrive = currentStatus === 'viagem_iniciada';

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={FretixColors.yellow}
              colors={[FretixColors.yellow]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <Pressable style={styles.iconButton} onPress={() => goBackSmart({ returnTo, from, fallback: '/trips' })}>
              <Ionicons name="arrow-back" size={20} color={FretixColors.white} />
            </Pressable>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerEyebrow}>Viagem ativa</Text>
              <Text style={styles.headerTitle}>Detalhes da viagem</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroBadgeRow}>
              <View style={styles.livePill}>
                <View style={[styles.liveDot, currentStatus === 'viagem_iniciada' && styles.liveDotActive]} />
                <Text style={styles.livePillText}>
                  {currentStatus === 'viagem_iniciada' ? 'Ao vivo' : 'Monitorada'}
                </Text>
              </View>
              <TripStatusBadge status={getTripStatus(currentStatus)} />
            </View>

            <View style={styles.heroTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tripId}>Viagem #{activeTrip.id}</Text>
                <Text style={styles.loadCode}>{activeTrip.load_code || 'Carga sem código'}</Text>
              </View>
            </View>

            <Text style={styles.heroStatusLabel}>{getTripStatusLabel(currentStatus)}</Text>
            <Text style={styles.heroSummaryText}>
              {currentStatus === 'aguardando_inicio'
                ? 'Tudo pronto para começar. Inicie a viagem quando estiver preparado.'
                : currentStatus === 'viagem_iniciada'
                  ? 'Acompanhe a rota, partilhe sua localização e registe paradas durante o percurso.'
                  : currentStatus === 'aguardando_cliente'
                    ? 'Chegada confirmada. Agora o cliente precisa validar a entrega.'
                    : 'Viagem concluída com sucesso.'}
            </Text>

            <View style={styles.routeCard}>
              <View style={styles.routePointRow}>
                <View style={styles.routePinBlue}>
                  <Ionicons name="navigate" size={12} color="#60A5FA" />
                </View>
                <View style={styles.routePointContent}>
                  <Text style={styles.routePointLabel}>Origem</Text>
                  <Text style={styles.routePointText}>{activeTrip.origin}</Text>
                </View>
              </View>
              <View style={styles.routeDivider} />
              <View style={styles.routePointRow}>
                <View style={styles.routePinYellow}>
                  <Ionicons name="flag" size={12} color="#101217" />
                </View>
                <View style={styles.routePointContent}>
                  <Text style={styles.routePointLabel}>Destino</Text>
                  <Text style={styles.routePointText}>{activeTrip.destination}</Text>
                </View>
              </View>
            </View>

            <View style={styles.operationalRow}>
              <View style={styles.operationalCard}>
                <Text style={styles.operationalLabel}>Cliente</Text>
                <Text style={styles.operationalValue}>{activeTrip.client_name || '—'}</Text>
              </View>
              <View style={styles.operationalCard}>
                <Text style={styles.operationalLabel}>Paradas</Text>
                <Text style={styles.operationalValue}>{stops.length}</Text>
              </View>
            </View>

            <View style={styles.progressBlock}>
              <View style={styles.progressHeader}>
                <Text style={styles.sectionMiniTitle}>Progresso da rota</Text>
                <Text style={styles.progressText}>{Math.round(progress)}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>
          </View>

          <View style={styles.mapCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Rota da viagem</Text>
              {routeLoading ? <ActivityIndicator size="small" color={FretixColors.yellow} /> : null}
            </View>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: routeCoordinates[0]?.latitude ?? -19.0,
                longitude: routeCoordinates[0]?.longitude ?? 35.0,
                latitudeDelta: 8,
                longitudeDelta: 8,
              }}
            >
              {routeCoordinates.length > 1 ? (
                <Polyline coordinates={routeCoordinates} strokeColor="rgba(255,193,7,0.35)" strokeWidth={3} />
              ) : null}
              {liveRouteCoordinates.length > 1 ? (
                <Polyline coordinates={liveRouteCoordinates} strokeColor={FretixColors.yellow} strokeWidth={4} />
              ) : null}
              <Marker coordinate={routeCoordinates[0]} title="Origem" pinColor="#60A5FA" />
              <Marker coordinate={routeCoordinates[routeCoordinates.length - 1]} title="Destino" pinColor={FretixColors.yellow} />
              {liveMarker ? <Marker coordinate={liveMarker} title="Localização atual" pinColor="#22C55E" /> : null}
            </MapView>
            {lastLocationUpdateAt ? (
              <Text style={styles.mapHint}>Última atualização ao vivo: {formatDateTime(lastLocationUpdateAt)}</Text>
            ) : null}
            <Text style={styles.mapHint}>Pontos no trajeto: {liveRouteCoordinates.length}</Text>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Distância total</Text>
              <Text style={styles.metricValue}>{formatDistance(activeTrip.total_distance_km)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Percorrida</Text>
              <Text style={styles.metricValue}>{formatDistance(activeTrip.traveled_distance_km)}</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Tempo estimado</Text>
              <Text style={styles.metricValue}>{activeTrip.estimated_time || '—'}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Partida</Text>
              <Text style={styles.metricValue}>{formatDate(activeTrip.departure_date)}</Text>
            </View>
          </View>

          <View style={styles.liveStatusCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Estado em tempo real</Text>
              <View style={[styles.liveStateBadge, isDriverLocationSharing && styles.liveStateBadgeActive]}>
                <Text style={[styles.liveStateBadgeText, isDriverLocationSharing && styles.liveStateBadgeTextActive]}>
                  {isDriverLocationSharing ? 'GPS ativo' : 'GPS inativo'}
                </Text>
              </View>
            </View>

            <View style={styles.liveStatusGrid}>
              <View style={styles.liveStatusItem}>
                <Text style={styles.liveStatusLabel}>Partilha</Text>
                <Text style={styles.liveStatusValue}>{isDriverLocationSharing ? 'Ativa' : 'Inativa'}</Text>
              </View>
              <View style={styles.liveStatusItem}>
                <Text style={styles.liveStatusLabel}>Permissão</Text>
                <Text style={styles.liveStatusValue}>{driverLocationPermissionGranted ? 'Concedida' : 'Pendente'}</Text>
              </View>
              <View style={styles.liveStatusItem}>
                <Text style={styles.liveStatusLabel}>Estado</Text>
                <Text style={styles.liveStatusValue}>{driverLocationSharingStatus}</Text>
              </View>
              <View style={styles.liveStatusItem}>
                <Text style={styles.liveStatusLabel}>Último envio</Text>
                <Text style={styles.liveStatusValue}>{formatDateTime(driverLocationLastSentAt)}</Text>
              </View>
            </View>
            {driverLocationError ? <Text style={styles.locationErrorText}>{driverLocationError}</Text> : null}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Cliente</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nome</Text>
              <Text style={styles.infoValue}>{activeTrip.client_name || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Telefone</Text>
              <Text style={styles.infoValue}>{activeTrip.client_phone || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Iniciada em</Text>
              <Text style={styles.infoValue}>{formatDateTime(activeTrip.started_at)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Chegada</Text>
              <Text style={styles.infoValue}>{formatDateTime(activeTrip.arrived_at)}</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Paradas registradas</Text>
              <Pressable
                onPress={() =>
                  pushWithReturnTo(
                    '/trip_stops',
                    { id: activeTrip.id },
                    buildReturnTo('/trip_details', { id: activeTrip.id, returnTo }),
                  )
                }
              >
                <Text style={styles.linkText}>Ver todas</Text>
              </Pressable>
            </View>

            {stops.length === 0 ? (
              <View style={styles.stopEmptyCard}>
                <Ionicons name="pause-circle-outline" size={22} color={FretixColors.yellow} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.stopEmptyTitle}>Sem paradas por enquanto</Text>
                  <Text style={styles.stopEmptySubtitle}>Registe abastecimento, pausa ou qualquer ocorrência do percurso.</Text>
                </View>
              </View>
            ) : (
              stops.slice(0, 3).map((stop, index) => (
                <View key={stop.id} style={[styles.stopRow, index < Math.min(stops.length, 3) - 1 && styles.stopRowBorder]}>
                  <View style={styles.stopTimeline}>
                    <View style={styles.stopIconWrap}>
                      <Ionicons name="pause-circle-outline" size={18} color={FretixColors.yellow} />
                    </View>
                    {index < Math.min(stops.length, 3) - 1 ? <View style={styles.stopTimelineLine} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stopTitle}>{stop.location_name || stop.address || stop.stop_type}</Text>
                    <Text style={styles.stopSubtitle}>{stop.stop_type}</Text>
                    <Text style={styles.stopSubtitle}>{formatDateTime(stop.stopped_at)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() =>
              pushWithReturnTo(
                '/trip_stops',
                { id: activeTrip.id },
                buildReturnTo('/trip_details', { id: activeTrip.id, returnTo }),
              )
            }
          >
            <Ionicons name="add-circle-outline" size={18} color={FretixColors.white} />
            <Text style={styles.secondaryButtonText}>Adicionar parada</Text>
          </Pressable>

          {canStart ? (
            <Pressable style={styles.primaryButton} onPress={handleStartTrip} disabled={starting}>
              {starting ? <ActivityIndicator size="small" color="#101217" /> : <Text style={styles.primaryButtonText}>Iniciar viagem</Text>}
            </Pressable>
          ) : null}

          {canArrive ? (
            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                pushWithReturnTo(
                  '/trip_arrival_confirm',
                  { id: activeTrip.id },
                  buildReturnTo('/trip_details', { id: activeTrip.id, returnTo }),
                )
              }
            >
              <Text style={styles.primaryButtonText}>Confirmar chegada</Text>
            </Pressable>
          ) : null}
        </View>

        <CustomDialog
          visible={dialogVisible}
          title={dialogProps.title}
          message={dialogProps.message}
          type={dialogProps.type}
          onConfirm={() => setDialogVisible(false)}
          onCancel={() => setDialogVisible(false)}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: FretixColors.black },
  safeArea: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: BottomTabInset + 140, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#141B24',
    borderWidth: 1,
    borderColor: '#263242',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flex: 1, gap: 2 },
  headerEyebrow: { color: FretixColors.grayLight, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  headerTitle: { color: FretixColors.white, fontSize: 20, fontWeight: '800' },
  headerSpacer: { width: 42 },
  heroCard: {
    backgroundColor: '#101720',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2A3646',
    padding: 18,
    gap: 14,
  },
  heroBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#64748B' },
  liveDotActive: { backgroundColor: '#22C55E' },
  livePillText: { color: FretixColors.white, fontSize: 12, fontWeight: '700' },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  tripId: { color: FretixColors.white, fontSize: 18, fontWeight: '800' },
  loadCode: { color: FretixColors.grayLight, fontSize: 13, marginTop: 4 },
  heroStatusLabel: { color: FretixColors.yellow, fontSize: 13, fontWeight: '700' },
  heroSummaryText: { color: '#CBD5E1', fontSize: 13, lineHeight: 19 },
  routeCard: { backgroundColor: '#0B1118', borderRadius: 18, padding: 14, gap: 10 },
  routePointRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routePointContent: { flex: 1, gap: 2 },
  routePointLabel: { color: '#94A3B8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  routePointText: { flex: 1, color: FretixColors.white, fontSize: 14, fontWeight: '600' },
  routeDivider: { width: 1, height: 18, backgroundColor: '#334155', marginLeft: 17 },
  routePinBlue: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(96,165,250,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routePinYellow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: FretixColors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  operationalRow: { flexDirection: 'row', gap: 12 },
  operationalCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  operationalLabel: { color: '#94A3B8', fontSize: 12 },
  operationalValue: { color: FretixColors.white, fontSize: 15, fontWeight: '800' },
  progressBlock: { gap: 8 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionMiniTitle: { color: FretixColors.white, fontSize: 14, fontWeight: '700' },
  progressText: { color: FretixColors.grayLight, fontSize: 13 },
  progressTrack: { height: 10, borderRadius: 999, backgroundColor: '#1E293B', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: FretixColors.yellow },
  mapCard: {
    backgroundColor: '#111824',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#273241',
    padding: 14,
    gap: 10,
  },
  map: { width: '100%', height: 240, borderRadius: 14 },
  mapHint: { color: FretixColors.grayLight, fontSize: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: FretixColors.white, fontSize: 16, fontWeight: '800' },
  metricsRow: { flexDirection: 'row', gap: 12 },
  metricCard: {
    flex: 1,
    backgroundColor: '#111824',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#273241',
    padding: 14,
    gap: 6,
  },
  metricLabel: { color: '#94A3B8', fontSize: 12 },
  metricValue: { color: FretixColors.white, fontSize: 15, fontWeight: '700' },
  infoCard: {
    backgroundColor: '#111824',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#273241',
    padding: 16,
    gap: 14,
  },
  liveStatusCard: {
    backgroundColor: '#111824',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#273241',
    padding: 16,
    gap: 14,
  },
  liveStateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(148,163,184,0.12)',
  },
  liveStateBadgeActive: {
    backgroundColor: 'rgba(34,197,94,0.14)',
  },
  liveStateBadgeText: { color: '#CBD5E1', fontSize: 12, fontWeight: '700' },
  liveStateBadgeTextActive: { color: '#86EFAC' },
  liveStatusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  liveStatusItem: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: '#0D131B',
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  liveStatusLabel: { color: '#94A3B8', fontSize: 11, textTransform: 'uppercase' },
  liveStatusValue: { color: FretixColors.white, fontSize: 13, fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  infoLabel: { color: '#94A3B8', fontSize: 13 },
  infoValue: { color: FretixColors.white, fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  linkText: { color: FretixColors.yellow, fontSize: 13, fontWeight: '700' },
  emptyText: { color: FretixColors.grayLight, fontSize: 13 },
  stopEmptyCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: '#0D131B',
    borderRadius: 16,
    padding: 14,
  },
  stopEmptyTitle: { color: FretixColors.white, fontSize: 14, fontWeight: '700' },
  stopEmptySubtitle: { color: FretixColors.grayLight, fontSize: 12, lineHeight: 17, marginTop: 4 },
  stopRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stopRowBorder: { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  stopTimeline: { alignItems: 'center' },
  stopIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0D131B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopTimelineLine: { width: 1, flex: 1, minHeight: 24, backgroundColor: '#334155', marginTop: 6 },
  stopTitle: { color: FretixColors.white, fontSize: 14, fontWeight: '700' },
  stopSubtitle: { color: FretixColors.grayLight, fontSize: 12, marginTop: 2 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: BottomTabInset,
    backgroundColor: '#0B0F14',
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    gap: 10,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: FretixColors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#101217', fontSize: 16, fontWeight: '800' },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#111824',
    borderWidth: 1,
    borderColor: '#273241',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  locationErrorText: { color: '#FCA5A5', fontSize: 12, lineHeight: 18 },
  secondaryButtonText: { color: FretixColors.white, fontSize: 15, fontWeight: '700' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  emptyTitle: { color: FretixColors.white, fontSize: 18, fontWeight: '800' },
}
