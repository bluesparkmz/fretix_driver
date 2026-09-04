import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomDialog } from '@/components/custom-dialog';
import { BottomTabInset, FretixColors } from '@/constants/theme';
import { googleMapsService, type MozambiquePlaceSuggestion } from '@/services/google-maps';
import { tripService, type TripStop } from '@/services/trips';
import { goBackSmart, useSmartBackHandler } from '@/utils/navigation';

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

export default function TripStopDetailsScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    stopId?: string;
    locationName?: string;
    address?: string;
    stoppedAt?: string;
    stopType?: string;
    notes?: string;
    returnTo?: string | string[];
    from?: string | string[];
  }>();

  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const stopId = Array.isArray(params.stopId) ? params.stopId[0] : params.stopId;
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const from = Array.isArray(params.from) ? params.from[0] : params.from;

  const [stop, setStop] = useState<TripStop | null>(null);
  const [loading, setLoading] = useState(true);
  const [place, setPlace] = useState<MozambiquePlaceSuggestion | null>(null);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogProps, setDialogProps] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info',
  });

  useSmartBackHandler({ returnTo, from, fallback: '/trips' });

  const showDialog = useCallback((title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setDialogProps({ title, message, type });
    setDialogVisible(true);
  }, []);

  const fallbackStop = useMemo<TripStop | null>(() => {
    if (!id || !stopId) return null;
    return {
      id: Number(stopId),
      trip_id: Number(id),
      stop_type: (Array.isArray(params.stopType) ? params.stopType[0] : params.stopType) || 'parada',
      location_name: Array.isArray(params.locationName) ? params.locationName[0] : params.locationName,
      address: Array.isArray(params.address) ? params.address[0] : params.address,
      notes: Array.isArray(params.notes) ? params.notes[0] : params.notes,
      stopped_at: (Array.isArray(params.stoppedAt) ? params.stoppedAt[0] : params.stoppedAt) || new Date().toISOString(),
    };
  }, [id, params.address, params.locationName, params.notes, params.stopType, params.stoppedAt, stopId]);

  const loadStop = useCallback(async () => {
    if (!id || !stopId) return;

    try {
      setLoading(true);
      const stops = await tripService.getTripStops(id);
      const match = stops.find((item) => String(item.id) === String(stopId)) ?? fallbackStop;
      setStop(match ?? null);
    } catch (error) {
      console.error('Failed to load trip stop details:', error);
      setStop(fallbackStop);
      showDialog('Aviso', 'Não foi possível recarregar a parada; a tela está usando os dados da lista.', 'info');
    } finally {
      setLoading(false);
    }
  }, [fallbackStop, id, showDialog, stopId]);

  useEffect(() => {
    void loadStop();
  }, [loadStop]);

  useEffect(() => {
    if (!stop?.address) return;

    let mounted = true;
    const loadPlace = async () => {
      try {
        setPlaceLoading(true);
        const results = await googleMapsService.searchMozambiquePlaces(stop.address);
        if (!mounted || results.length === 0) {
          if (mounted) setPlace(null);
          return;
        }

        const detail = await googleMapsService.getPlaceDetails(results[0].id);
        if (!mounted) return;
        setPlace(detail);
      } catch (error) {
        if (!mounted) return;
        console.error('Failed to load stop place details:', error);
        setPlace(null);
      } finally {
        if (mounted) setPlaceLoading(false);
      }
    };

    void loadPlace();
    return () => {
      mounted = false;
    };
  }, [stop?.address]);

  if (loading) {
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

  if (!stop) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Parada não encontrada</Text>
            <Pressable style={styles.secondaryButton} onPress={() => goBackSmart({ returnTo, from, fallback: '/trips' })}>
              <Text style={styles.secondaryButtonText}>Voltar</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const coordinate = place?.coordinate;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Pressable style={styles.iconButton} onPress={() => goBackSmart({ returnTo, from, fallback: '/trips' })}>
              <Ionicons name="arrow-back" size={20} color={FretixColors.white} />
            </Pressable>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerEyebrow}>Parada</Text>
              <Text style={styles.headerTitle}>Detalhes da parada</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="pause-circle" size={26} color={FretixColors.yellow} />
            </View>
            <Text style={styles.heroTitle}>{stop.location_name || stop.address || stop.stop_type}</Text>
            <Text style={styles.heroSubtitle}>{stop.stop_type}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Informações</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tipo</Text>
              <Text style={styles.infoValue}>{stop.stop_type}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Local</Text>
              <Text style={styles.infoValue}>{stop.location_name || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Endereço</Text>
              <Text style={styles.infoValue}>{stop.address || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Data e hora</Text>
              <Text style={styles.infoValue}>{formatDateTime(stop.stopped_at)}</Text>
            </View>
            <View style={styles.notesBlock}>
              <Text style={styles.infoLabel}>Notas</Text>
              <Text style={styles.notesText}>{stop.notes || 'Sem observações.'}</Text>
            </View>
          </View>

          <View style={styles.mapCard}>
            <View style={styles.mapHeader}>
              <Text style={styles.sectionTitle}>Parada no mapa</Text>
              {placeLoading ? <ActivityIndicator size="small" color={FretixColors.yellow} /> : null}
            </View>
            {coordinate ? (
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: coordinate.latitude,
                  longitude: coordinate.longitude,
                  latitudeDelta: 0.04,
                  longitudeDelta: 0.04,
                }}
              >
                <Marker coordinate={coordinate} title={stop.location_name || stop.stop_type} description={stop.address || undefined} />
              </MapView>
            ) : (
              <View style={styles.mapFallback}>
                <Ionicons name="map-outline" size={28} color={FretixColors.grayLight} />
                <Text style={styles.mapFallbackTitle}>Mapa indisponível</Text>
                <Text style={styles.mapFallbackText}>Não conseguimos localizar esta parada automaticamente pelo endereço.</Text>
              </View>
            )}
            {place?.address ? <Text style={styles.mapAddress}>{place.address}</Text> : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.secondaryButton} onPress={() => goBackSmart({ returnTo, from, fallback: '/trips' })}>
            <Text style={styles.secondaryButtonText}>Voltar</Text>
          </Pressable>
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
  content: { padding: 16, paddingBottom: BottomTabInset + 100, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1, gap: 2 },
  headerEyebrow: { color: FretixColors.grayLight, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  headerTitle: { color: FretixColors.white, fontSize: 20, fontWeight: '800' },
  headerSpacer: { width: 42 },
  heroCard: {
    backgroundColor: '#101720',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2A3646',
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  heroIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,193,7,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: FretixColors.white, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  heroSubtitle: { color: FretixColors.yellow, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  infoCard: {
    backgroundColor: '#111824',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#273241',
    padding: 16,
    gap: 14,
  },
  sectionTitle: { color: FretixColors.white, fontSize: 16, fontWeight: '800' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  infoLabel: { color: '#94A3B8', fontSize: 13 },
  infoValue: { color: FretixColors.white, fontSize: 13, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  notesBlock: { gap: 8 },
  notesText: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 19,
    backgroundColor: '#0D131B',
    borderRadius: 14,
    padding: 14,
  },
  mapCard: {
    backgroundColor: '#111824',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#273241',
    padding: 14,
    gap: 12,
  },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  map: { width: '100%', height: 260, borderRadius: 16 },
  mapFallback: {
    height: 220,
    borderRadius: 16,
    backgroundColor: '#0D131B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  mapFallbackTitle: { color: FretixColors.white, fontSize: 16, fontWeight: '800' },
  mapFallbackText: { color: FretixColors.grayLight, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  mapAddress: { color: '#CBD5E1', fontSize: 12, lineHeight: 18 },
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
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#111824',
    borderWidth: 1,
    borderColor: '#273241',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: { color: FretixColors.white, fontSize: 15, fontWeight: '700' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  emptyTitle: { color: FretixColors.white, fontSize: 18, fontWeight: '800' },
});
