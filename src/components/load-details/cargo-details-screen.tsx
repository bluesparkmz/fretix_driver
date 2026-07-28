import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadTypeImage } from '@/components/load-type-image';
import { RouteMapPreview } from '@/components/load-create/route-map-preview';
import { SkeletonCargoDetails } from '@/components/SkeletonLoader';
import { withAlpha } from '@/components/wallet/utils';
import { FretixColors } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { googleMapsService, type GoogleRouteSuggestion } from '@/services/google-maps';
import { LoadDetail, loadService } from '@/services/loads';

import { CargoDetailsHeader } from './cargo-details-header';

type InfoRow = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'disponivel':
      return { bg: withAlpha('#22C55E', 0.16), text: '#86EFAC', label: 'Disponível' };
    case 'em_andamento':
      return { bg: withAlpha('#3B82F6', 0.16), text: '#93C5FD', label: 'Em andamento' };
    case 'concluido':
      return { bg: withAlpha('#A855F7', 0.16), text: '#D8B4FE', label: 'Concluído' };
    default:
      return { bg: withAlpha('#4B5563', 0.16), text: '#9CA3AF', label: status };
  }
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatValue = (value: number) => {
  return value.toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT';
};

const getLoadTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    areia: 'Areia',
    cimento: 'Cimento',
    cascalho: 'Cascalho',
    combustivel: 'Combustível',
    ferro: 'Ferro',
    madeira: 'Madeira',
    graos: 'Grãos',
    'mercadoria-geral': 'Mercadoria geral',
    mercadoria_geral: 'Mercadoria geral',
    outro: 'Outro',
  };
  return map[type] || type;
};

const getWeightUnitLabel = (unit: string) => {
  return unit === 'ton' ? 'Toneladas' : unit === 'kg' ? 'Quilogramas' : unit;
};

const toCoordinateNumber = (value: number | string | null | undefined, fallback: number) => {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : value;
  return Number.isFinite(parsed) ? Number(parsed) : fallback;
};

type InitialLoadDetail = Partial<Omit<LoadDetail, 'value'>> & {
  value?: number | null;
};

function toInitialLoadDetail(load: InitialLoadDetail): LoadDetail {
  return {
    ...load,
    id: load.id ?? 0,
    code: load.code ?? String(load.id ?? ''),
    load_type: load.load_type ?? 'outro',
    load_name: load.load_name ?? 'Carga',
    origin: load.origin ?? '-',
    destination: load.destination ?? '-',
    origin_lat: load.origin_lat ?? 0,
    origin_lng: load.origin_lng ?? 0,
    destination_lat: load.destination_lat ?? 0,
    destination_lng: load.destination_lng ?? 0,
    weight: load.weight ?? 0,
    weight_unit: load.weight_unit ?? 'ton',
    value: load.value ?? 0,
    negotiable: load.negotiable ?? false,
    status: load.status ?? 'disponivel',
    departure_date: load.departure_date ?? new Date().toISOString(),
    created_at: load.created_at ?? new Date().toISOString(),
  };
}

type Props = { id: number | null; from?: string };

export function CargoDetailsScreen({ id, from }: Props) {
  const { getCachedLoadById, getCachedProposalLoadById } = useAppData();
  const cachedLoad = getCachedLoadById(id);
  const cachedProposalLoad = getCachedProposalLoadById(id);
  const initialLoad = cachedLoad ?? cachedProposalLoad;

  const [load, setLoad] = useState<LoadDetail | null>(() =>
    initialLoad ? toInitialLoadDetail(initialLoad) : null,
  );
  const [loading, setLoading] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeOptions, setRouteOptions] = useState<GoogleRouteSuggestion[]>([]);
  const { user } = useAuth();
  const isSender = user && load?.sender ? String(user.id) === String(load.sender.user_id) : false;

  useEffect(() => {
    if (!initialLoad || load) return;
    setLoad(toInitialLoadDetail(initialLoad));
  }, [initialLoad, load]);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        if (!load && !initialLoad) {
          setLoading(true);
        }
        const data = await loadService.getLoadById(id);
        setLoad(data);
      } catch (error) {
        console.error('Failed to fetch load:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [id]);

  if (loading && !load) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <CargoDetailsHeader from={from} />
            <SkeletonCargoDetails />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  if (!load) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.notFoundText}>Carga não encontrada</Text>
      </View>
    );
  }

  const status = getStatusColor(load.status);

  const originCoordinate = useMemo(
    () => ({
      latitude: toCoordinateNumber(load.origin_lat, -25.9692),
      longitude: toCoordinateNumber(load.origin_lng, 32.5732),
    }),
    [load.origin_lat, load.origin_lng],
  );

  const destinationCoordinate = useMemo(
    () => ({
      latitude: toCoordinateNumber(load.destination_lat, -18.148),
      longitude: toCoordinateNumber(load.destination_lng, 35.5873),
    }),
    [load.destination_lat, load.destination_lng],
  );

  useEffect(() => {
    let active = true;

    const loadRoutePreview = async () => {
      if (
        !Number.isFinite(originCoordinate.latitude) ||
        !Number.isFinite(originCoordinate.longitude) ||
        !Number.isFinite(destinationCoordinate.latitude) ||
        !Number.isFinite(destinationCoordinate.longitude)
      ) {
        if (active) setRouteOptions([]);
        return;
      }

      try {
        setRouteLoading(true);
        const routes = await googleMapsService.getDrivingRouteSuggestions(originCoordinate, destinationCoordinate);
        if (!active) return;
        setRouteOptions(routes);
      } catch (error) {
        if (!active) return;
        console.error('Failed to load cargo route preview:', error);
        setRouteOptions([]);
      } finally {
        if (active) setRouteLoading(false);
      }
    };

    void loadRoutePreview();

    return () => {
      active = false;
    };
  }, [destinationCoordinate, originCoordinate]);

  const aboutRows: InfoRow[] = [
    { icon: 'cube-outline', label: 'Tipo de carga', value: load.load_type_label || getLoadTypeLabel(load.load_type) },
    { icon: 'document-text-outline', label: 'Descrição', value: load.description || 'Descrição da carga' },
    { icon: 'scale-outline', label: 'Peso total', value: `${load.weight} ${getWeightUnitLabel(load.weight_unit)}` },
    { icon: 'expand-outline', label: 'Volume', value: load.volume != null ? String(load.volume) : '-' },
    { icon: 'cash-outline', label: 'Valor da carga', value: `${formatValue(load.value)}${load.negotiable ? ' (Negociável)' : ''}` },
    { icon: 'bus-outline', label: 'Tipo de veículo sugerido', value: load.suggested_vehicle_type || '-' },
    { icon: 'alert-circle-outline', label: 'Observações', value: load.instructions || '-' },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <CargoDetailsHeader from={from} />

          <View style={styles.summaryCard}>
            <View style={styles.imageWrap}>
              <LoadTypeImage loadType={load.load_type} style={styles.cargoImage} fallbackIconSize={40} />
            </View>

            <View style={styles.summaryMain}>
              <View style={styles.completeBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#86EFAC" />
                <Text style={styles.completeBadgeText}>Carga completa</Text>
              </View>
              <Text style={styles.cargoName}>{load.load_name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>{formatValue(load.value)}</Text>
                {load.negotiable ? <Text style={styles.negotiable}>Negociável</Text> : null}
              </View>

              <View style={styles.routeBlock}>
                <View style={styles.routePoint}>
                  <Ionicons name="location" size={14} color="#3B82F6" />
                  <Text style={styles.routeText}>{load.origin}</Text>
                </View>
                <View style={styles.routeConnector}>
                  <View style={styles.routeLine} />
                  <Ionicons name="arrow-down" size={12} color={FretixColors.grayLight} />
                </View>
                <View style={styles.routePoint}>
                  <Ionicons name="location" size={14} color={FretixColors.yellow} />
                  <Text style={styles.routeText}>{load.destination}</Text>
                </View>
              </View>

              <View style={styles.quickMeta}>
                <View style={styles.quickMetaItem}>
                  <Ionicons name="calendar-outline" size={13} color={FretixColors.grayLight} />
                  <Text style={styles.quickMetaText}>{formatDate(load.departure_date)}</Text>
                </View>
                <View style={styles.quickMetaItem}>
                  <Ionicons name="scale-outline" size={13} color={FretixColors.grayLight} />
                  <Text style={styles.quickMetaText}>{load.weight} {getWeightUnitLabel(load.weight_unit)}</Text>
                </View>
                <View style={styles.quickMetaItem}>
                  <Ionicons name="cube-outline" size={13} color={FretixColors.grayLight} />
                  <Text style={styles.quickMetaText}>{load.volume != null ? `${load.volume}` : 'Volume não informado'}</Text>
                </View>
              </View>
            </View>
          </View>

          <Pressable
            style={styles.statusBar}
            onPress={() => router.push('/proposals-received')}
            accessibilityRole="button"
            accessibilityLabel="Ver propostas recebidas"
          >
            <View style={styles.statusCell}>
              <Text style={styles.statusLabel}>Status da carga</Text>
              <View style={[styles.availableBadge, { backgroundColor: status.bg }]}>
                <Text style={[styles.availableBadgeText, { color: status.text }]}>{status.label}</Text>
              </View>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusCell}>
              <Text style={styles.statusLabel}>ID da carga</Text>
              <View style={styles.idRow}>
                <Text style={styles.idValue}>#{load.code}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Copiar ID">
                  <Ionicons name="copy-outline" size={16} color={FretixColors.grayLight} />
                </Pressable>
              </View>
            </View>
          </Pressable>

          <Text style={styles.sectionTitle}>Remetente</Text>
          <View style={styles.senderCard}>
            <Image source={load?.sender?.profile_photo ? { uri: load.sender.profile_photo } : undefined} style={styles.senderAvatar} />
            <View style={styles.senderMain}>
              <View style={styles.senderNameRow}>
                <Text style={styles.senderName}>{user?.name || 'Usuário'}</Text>
                {user?.verified ? <Ionicons name="checkmark-circle" size={16} color="#3B82F6" /> : null}
              </View>
              <View style={styles.verifiedRow}>
                <Ionicons name="checkmark-circle" size={12} color="#22C55E" />
                <Text style={styles.verifiedText}>Cliente verificado</Text>
              </View>
              {user?.phone ? <Text style={styles.senderPhone}>{user.phone}</Text> : null}
            </View>
            {!isSender ? (
              <View style={styles.senderActions}>
                <Pressable
                  style={styles.senderActionButton}
                  onPress={() => router.push({ pathname: '/create-proposal', params: { loadId: id } })}
                  accessibilityRole="button"
                >
                  <Ionicons name="documents-outline" size={18} color={FretixColors.white} />
                  <Text style={styles.senderActionLabel}>Enviar proposta</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Sobre a carga</Text>
          <View style={styles.infoCard}>
            {aboutRows.map((row, index) => (
              <View key={row.label} style={[styles.infoRow, index < aboutRows.length - 1 && styles.infoRowBorder]}>
                <View style={styles.infoIconWrap}>
                  <Ionicons name={row.icon} size={18} color={FretixColors.yellow} />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue}>{row.value}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Datas</Text>
          <View style={styles.datesCard}>
            <View style={styles.dateRow}>
              <Ionicons name="time-outline" size={18} color={FretixColors.yellow} />
              <View style={styles.dateText}>
                <Text style={styles.dateLabel}>Publicada em</Text>
                <Text style={styles.dateValue}>{formatDate(load.created_at)}</Text>
              </View>
            </View>
            <View style={styles.dateDivider} />
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={18} color={FretixColors.yellow} />
              <View style={styles.dateText}>
                <Text style={styles.dateLabel}>Prazo para transporte</Text>
                <Text style={styles.dateValue}>{formatDate(load.departure_date)}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Rota</Text>
          <View style={styles.mapPreviewWrap}>
            <RouteMapPreview
              origin={originCoordinate}
              destination={destinationCoordinate}
              routes={routeOptions}
              loading={routeLoading}
            />
          </View>
        </ScrollView>

        {isSender ? (
          <View style={styles.footer}>
            <Pressable
              style={styles.primaryFooterButton}
              onPress={() => router.push({ pathname: '/loads_create', params: { id } })}
              accessibilityRole="button"
            >
              <Ionicons name="create-outline" size={18} color="#101217" />
              <Text style={styles.primaryFooterText}>Editar carga</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.footer}>
            <Pressable
              style={styles.primaryFooterButton}
              onPress={() => router.push({ pathname: '/create-proposal', params: { loadId: id } })}
              accessibilityRole="button"
            >
              <Ionicons name="paper-plane-outline" size={18} color="#101217" />
              <Text style={styles.primaryFooterText}>Enviar proposta</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FretixColors.black,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 14,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notFoundText: {
    color: FretixColors.white,
    fontSize: 18,
    textAlign: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  imageWrap: {
    position: 'relative',
  },
  cargoImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#111723',
  },
  summaryMain: {
    flex: 1,
    gap: 6,
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#14532D',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  completeBadgeText: {
    color: '#86EFAC',
    fontSize: 10,
    fontWeight: '600',
  },
  cargoName: {
    color: FretixColors.white,
    fontSize: 22,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  price: {
    color: FretixColors.yellow,
    fontSize: 18,
    fontWeight: '700',
  },
  negotiable: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '600',
  },
  routeBlock: {
    marginTop: 4,
    gap: 2,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeText: {
    color: FretixColors.grayLight,
    fontSize: 11,
    flex: 1,
  },
  routeConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 2,
    gap: 4,
    marginVertical: 2,
  },
  routeLine: {
    width: 1,
    height: 14,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#4B5563',
    marginLeft: 6,
  },
  quickMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  quickMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickMetaText: {
    color: FretixColors.grayLight,
    fontSize: 10,
  },
  statusBar: {
    flexDirection: 'row',
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    overflow: 'hidden',
  },
  statusCell: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  statusDivider: {
    width: 1,
    backgroundColor: '#273444',
  },
  statusLabel: {
    color: FretixColors.grayLight,
    fontSize: 11,
  },
  availableBadge: {
    alignSelf: 'flex-start',
    backgroundColor: withAlpha('#22C55E', 0.16),
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  availableBadgeText: {
    color: '#86EFAC',
    fontSize: 12,
    fontWeight: '700',
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idValue: {
    color: FretixColors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    color: FretixColors.white,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  senderCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
  },
  senderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#273444',
  },
  senderMain: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  senderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  senderName: {
    color: FretixColors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    color: '#86EFAC',
    fontSize: 11,
  },
  senderPhone: {
    color: FretixColors.grayLight,
    fontSize: 12,
  },
  senderActions: {
    gap: 8,
  },
  senderActionButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1A2332',
    borderWidth: 1,
    borderColor: '#273444',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  senderActionLabel: {
    color: FretixColors.grayLight,
    fontSize: 8,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    alignItems: 'flex-start',
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#273444',
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: withAlpha(FretixColors.yellow, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    color: FretixColors.grayLight,
    fontSize: 11,
  },
  infoValue: {
    color: FretixColors.white,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  datesCard: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  dateText: {
    flex: 1,
    gap: 2,
  },
  dateLabel: {
    color: FretixColors.grayLight,
    fontSize: 11,
  },
  dateValue: {
    color: FretixColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  dateDivider: {
    height: 1,
    backgroundColor: '#273444',
  },
  mapPreviewWrap: {
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#273444',
    backgroundColor: FretixColors.black,
  },
  primaryFooterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: FretixColors.yellow,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryFooterText: {
    color: '#101217',
    fontSize: 13,
    fontWeight: '700',
  },
});
