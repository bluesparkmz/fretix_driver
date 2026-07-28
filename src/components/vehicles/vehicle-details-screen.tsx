import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { withAlpha } from '@/components/wallet/utils';
import { FretixColors } from '@/constants/theme';
import { vehicleService, type Vehicle } from '@/services/vehicles';
import { resolveMediaUrl } from '@/utils/media-url';
import { buildReturnTo, goBackSmart, pushWithReturnTo, useSmartBackHandler } from '@/utils/navigation';

type InfoRow = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'disponivel':
      return { bg: withAlpha('#22C55E', 0.16), text: '#86EFAC', label: 'Ativo' };
    case 'manutencao':
      return { bg: withAlpha('#F59E0B', 0.16), text: '#FCD34D', label: 'Manutenção' };
    case 'inativo':
      return { bg: withAlpha('#EF4444', 0.16), text: '#FCA5A5', label: 'Inativo' };
    default:
      return { bg: withAlpha('#4B5563', 0.16), text: '#9CA3AF', label: status };
  }
};

const formatCapacity = (value: number | null) => {
  if (value == null) return 'Capacidade não informada';
  return `${value.toLocaleString('pt-MZ')} Toneladas`;
};

const getVehicleTypeLabel = (type: string | null) => {
  if (!type) return 'Tipo não informado';
  const map: Record<string, string> = {
    camiao: 'Caminhão',
    Camiao: 'Caminhão',
    van: 'Van',
    Van: 'Van',
    carro: 'Carro',
    Carro: 'Carro',
    camionete: 'Camionete',
    Camionete: 'Camionete',
    trator: 'Trator',
    Trator: 'Trator',
  };
  return map[type] || type;
};

type Props = { id: number | null; returnTo?: string };
export function VehicleDetailsScreen({ id, returnTo }: Props) {
  console.log('=== VehicleDetailsScreen component received ID:', id);
  useSmartBackHandler({ returnTo, fallback: '/vehicles' });

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    try {
      if (!id) return;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      console.log('=== Fetching vehicle with ID:', id);
      const data = await vehicleService.getVehicleById(Number(id));
      console.log('=== Received vehicle data:', data);
      setVehicle(data);
    } catch (e) {
      console.error('Failed to fetch vehicle:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={FretixColors.yellow} size="large" />
      </View>
    );
  }

  if (!vehicle) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ color: FretixColors.white, fontSize: 18, textAlign: 'center' }}>
          Veículo não encontrado
        </Text>
      </View>
    );
  }

  const status = getStatusColor(vehicle.status);

  const aboutRows: InfoRow[] = [
    { icon: 'car-outline', label: 'Marca', value: vehicle.brand || 'Marca não informada' },
    { icon: 'build-outline', label: 'Modelo', value: vehicle.model_name || 'Modelo não informado' },
    { icon: 'cube-outline', label: 'Capacidade de carga', value: formatCapacity(vehicle.tonnage_capacity) },
    { icon: 'options-outline', label: 'Tipo de veículo', value: getVehicleTypeLabel(vehicle.vehicle_type) },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              colors={[FretixColors.yellow]}
              tintColor={FretixColors.yellow}
            />
          }>
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => goBackSmart({ returnTo, fallback: '/vehicles' })}>
              <Ionicons name="arrow-back" size={24} color={FretixColors.white} />
            </Pressable>
            <Text style={styles.headerTitle}>Detalhes do Veículo</Text>
            <Pressable 
              style={styles.editButton} 
              onPress={() =>
                pushWithReturnTo(
                  '/vehicle_edit',
                  { id: vehicle.id },
                  buildReturnTo('/vehicle_details', { id: vehicle.id, returnTo }),
                )
              }
            >
              <Ionicons name="pencil" size={20} color={FretixColors.white} />
            </Pressable>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.imageWrap}>
              <Image
                source={vehicle.photo ? { uri: resolveMediaUrl(vehicle.photo) ?? undefined } : undefined}
                style={styles.vehicleImage}
                resizeMode="cover"
              />
            </View>

            <View style={styles.summaryMain}>
              <Text style={styles.vehicleName}>
                {String([vehicle.brand, vehicle.model_name].filter(Boolean).join(' ') || 'Veículo')}
              </Text>
              <Text style={styles.vehiclePlate}>{String(vehicle.plate)}</Text>

              <View style={styles.quickMeta}>
                <View style={styles.quickMetaItem}>
                  <Ionicons name="cube-outline" size={13} color={FretixColors.grayLight} />
                  <Text style={styles.quickMetaText}>{String(formatCapacity(vehicle.tonnage_capacity))}</Text>
                </View>
                <View style={styles.quickMetaItem}>
                  <Ionicons name="options-outline" size={13} color={FretixColors.grayLight} />
                  <Text style={styles.quickMetaText}>{String(getVehicleTypeLabel(vehicle.vehicle_type))}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.statusBar}>
            <View style={styles.statusCell}>
              <Text style={styles.statusLabel}>Status do veículo</Text>
              <View style={[styles.availableBadge, { backgroundColor: status.bg }]}>
                <Text style={[styles.availableBadgeText, { color: status.text }]}>{String(status.label)}</Text>
              </View>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusCell}>
              <Text style={styles.statusLabel}>ID do veículo</Text>
              <Text style={styles.idValue}>#{String(vehicle.id)}</Text>
            </View>
          </View>

          {vehicle.driver_name && (
            <>
              <Text style={styles.sectionTitle}>Motorista Vinculado</Text>
              <View style={styles.driverCard}>
                <Image source={vehicle.driver_photo ? { uri: vehicle.driver_photo } : undefined} style={styles.driverAvatar} />
                <View style={styles.driverMain}>
                  <Text style={styles.driverName}>{String(vehicle.driver_name)}</Text>
                  {vehicle.driver_rating !== null && vehicle.driver_rating !== undefined && (
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.ratingText}>{String(Number(vehicle.driver_rating).toFixed(1))}</Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          )}

          <Text style={styles.sectionTitle}>Sobre o veículo</Text>
          <View style={styles.infoCard}>
            {aboutRows.map((row, index) => (
              <View
                key={row.label}
                style={[styles.infoRow, index < aboutRows.length - 1 && styles.infoRowBorder]}>
                <View style={styles.infoIconWrap}>
                  <Ionicons name={row.icon} size={18} color={FretixColors.yellow} />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>{String(row.label)}</Text>
                  <Text style={styles.infoValue}>{String(row.value)}</Text>
                </View>
              </View>
            ))}
          </View>

          {vehicle.location_updated_at && (
            <>
              <Text style={styles.sectionTitle}>Localização</Text>
              <View style={styles.locationCard}>
                <View style={styles.locationIconWrap}>
                  <Ionicons name="location" size={20} color={FretixColors.yellow} />
                </View>
                <View style={styles.locationText}>
                  <Text style={styles.locationLabel}>Última atualização</Text>
                  <Text style={styles.locationValue}>
                    {String(new Date(vehicle.location_updated_at).toLocaleString('pt-MZ'))}
                  </Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: FretixColors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  headerPlaceholder: {
    width: 40,
  },
  summaryCard: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  imageWrap: {
    position: 'relative',
  },
  vehicleImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#111723',
  },
  summaryMain: {
    flex: 1,
    gap: 6,
    justifyContent: 'center',
  },
  vehicleName: {
    color: FretixColors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  vehiclePlate: {
    color: FretixColors.yellow,
    fontSize: 14,
    fontWeight: '700',
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
    fontSize: 11,
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
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  availableBadgeText: {
    fontSize: 12,
    fontWeight: '700',
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
  driverCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#273444',
  },
  driverMain: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  driverName: {
    color: FretixColors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: FretixColors.grayLight,
    fontSize: 12,
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
  locationCard: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: withAlpha(FretixColors.yellow, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: {
    flex: 1,
    gap: 2,
  },
  locationLabel: {
    color: FretixColors.grayLight,
    fontSize: 11,
  },
  locationValue: {
    color: FretixColors.white,
    fontSize: 13,
    fontWeight: '600',
  },
});
