import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomDialog } from '@/components/custom-dialog';
import { BottomTabInset, FretixColors } from '@/constants/theme';
import { tripService, type TripStop, type TripStopType } from '@/services/trips';
import { buildReturnTo, goBackSmart, pushWithReturnTo, useSmartBackHandler } from '@/utils/navigation';

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

function toDatetimeLocalString(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function TripStopsScreen() {
  const params = useLocalSearchParams<{ id?: string; returnTo?: string | string[]; from?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const from = Array.isArray(params.from) ? params.from[0] : params.from;

  const [stops, setStops] = useState<TripStop[]>([]);
  const [stopTypes, setStopTypes] = useState<TripStopType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogProps, setDialogProps] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info',
  });

  const [selectedStopType, setSelectedStopType] = useState('');
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [stoppedAt, setStoppedAt] = useState(toDatetimeLocalString(new Date()));

  useSmartBackHandler({ returnTo, from, fallback: '/trips' });

  const showDialog = useCallback((title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setDialogProps({ title, message, type });
    setDialogVisible(true);
  }, []);

  const sortedStops = useMemo(
    () => [...stops].sort((a, b) => new Date(b.stopped_at).getTime() - new Date(a.stopped_at).getTime()),
    [stops],
  );

  const loadData = useCallback(async (silent = false) => {
    if (!id) return;
    try {
      if (!silent) setLoading(true);
      const [stopsData, typesData] = await Promise.all([
        tripService.getTripStops(id),
        tripService.getTripStopTypes().catch(() => []),
      ]);
      setStops(stopsData);
      setStopTypes(typesData);
      if (!selectedStopType && typesData[0]?.id) {
        setSelectedStopType(typesData[0].id);
      }
    } catch (error) {
      console.error('Failed to load trip stops:', error);
      showDialog('Erro', 'Não foi possível carregar as paradas da viagem.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, selectedStopType, showDialog]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadData(true);
  };

  const resetForm = () => {
    setLocationName('');
    setAddress('');
    setNotes('');
    setStoppedAt(toDatetimeLocalString(new Date()));
  };

  const handleCreateStop = async () => {
    if (!id) return;
    if (!selectedStopType) {
      showDialog('Tipo obrigatório', 'Selecione o tipo de parada.', 'info');
      return;
    }

    try {
      setSaving(true);
      const createdStop = await tripService.createTripStop(id, {
        stop_type: selectedStopType,
        location_name: locationName.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        stopped_at: stoppedAt ? new Date(stoppedAt).toISOString() : undefined,
      });

      setStops((current) => [createdStop, ...current]);
      setModalVisible(false);
      resetForm();
      showDialog('Parada registrada', 'A parada foi salva com sucesso.', 'success');
    } catch (error) {
      console.error('Failed to create stop:', error);
      showDialog('Erro', 'Não foi possível registrar a parada.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => goBackSmart({ returnTo, from, fallback: '/trips' })}>
            <Ionicons name="arrow-back" size={20} color={FretixColors.white} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Paradas da viagem</Text>
            <Text style={styles.subtitle}>Trip #{id}</Text>
          </View>
          <Pressable style={styles.iconButton} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={20} color={FretixColors.white} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={FretixColors.yellow} />
          </View>
        ) : (
          <FlatList
            data={sortedStops}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={FretixColors.yellow}
                colors={[FretixColors.yellow]}
              />
            }
            ListHeaderComponent={
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Todas as registradas</Text>
                <Text style={styles.summaryText}>
                  O backend atual só expõe paradas registradas nesta viagem. A aba de planejadas ficou de fora por enquanto.
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="pause-circle-outline" size={48} color={FretixColors.grayLight} />
                <Text style={styles.emptyTitle}>Nenhuma parada registrada</Text>
                <Text style={styles.emptyText}>Use o botão + para adicionar a primeira parada.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.stopCard}
                onPress={() =>
                  pushWithReturnTo(
                    '/trip_stop_details',
                    {
                      id: String(id),
                      stopId: item.id,
                      locationName: item.location_name || undefined,
                      address: item.address || undefined,
                      stoppedAt: item.stopped_at,
                      stopType: item.stop_type,
                      notes: item.notes || undefined,
                    },
                    buildReturnTo('/trip_stops', { id }),
                  )
                }
              >
                <View style={styles.stopCardHeader}>
                  <Text style={styles.stopTitle}>{item.location_name || item.address || item.stop_type}</Text>
                  <Text style={styles.stopType}>{item.stop_type}</Text>
                </View>
                <Text style={styles.stopMeta}>Data: {formatDateTime(item.stopped_at)}</Text>
                {item.address ? <Text style={styles.stopMeta}>Endereço: {item.address}</Text> : null}
                {item.notes ? <Text style={styles.stopMeta}>Notas: {item.notes}</Text> : null}
              </Pressable>
            )}
          />
        )}

        <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={22} color="#101217" />
          <Text style={styles.fabText}>Adicionar parada</Text>
        </Pressable>

        <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nova parada</Text>
                <Pressable onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={22} color={FretixColors.white} />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.fieldLabel}>Tipo de parada</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
                  {stopTypes.map((type) => {
                    const active = selectedStopType === type.id;
                    return (
                      <Pressable
                        key={type.id}
                        style={[styles.typeChip, active && styles.typeChipActive]}
                        onPress={() => setSelectedStopType(type.id)}
                      >
                        <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{type.label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Text style={styles.fieldLabel}>Nome do local</Text>
                <TextInput
                  value={locationName}
                  onChangeText={setLocationName}
                  placeholder="Ex: Posto Xai-Xai"
                  placeholderTextColor="#64748B"
                  style={styles.input}
                />

                <Text style={styles.fieldLabel}>Endereço</Text>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Ex: EN1, Gaza"
                  placeholderTextColor="#64748B"
                  style={styles.input}
                />

                <Text style={styles.fieldLabel}>Notas</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Ex: abastecimento / pausa / documentação"
                  placeholderTextColor="#64748B"
                  style={[styles.input, styles.textArea]}
                  multiline
                />

                <Text style={styles.fieldLabel}>Data e hora</Text>
                <TextInput
                  value={stoppedAt}
                  onChangeText={setStoppedAt}
                  placeholder="2026-07-28T12:30"
                  placeholderTextColor="#64748B"
                  style={styles.input}
                />
              </ScrollView>

              <View style={styles.modalFooter}>
                <Pressable style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>
                <Pressable style={styles.saveButton} onPress={handleCreateStop} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#101217" /> : <Text style={styles.saveButtonText}>Salvar</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(11,15,20,0.96)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: FretixColors.white, fontSize: 20, fontWeight: '800' },
  subtitle: { color: FretixColors.grayLight, fontSize: 12, marginTop: 2 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: BottomTabInset + 100, gap: 12 },
  summaryCard: {
    backgroundColor: '#111824',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#273241',
    padding: 16,
    marginBottom: 12,
  },
  summaryTitle: { color: FretixColors.white, fontSize: 15, fontWeight: '800' },
  summaryText: { color: FretixColors.grayLight, fontSize: 13, marginTop: 8, lineHeight: 18 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 64, gap: 10 },
  emptyTitle: { color: FretixColors.white, fontSize: 18, fontWeight: '800' },
  emptyText: { color: FretixColors.grayLight, fontSize: 13, textAlign: 'center' },
  stopCard: {
    backgroundColor: '#111824',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#273241',
    padding: 16,
    gap: 8,
    marginBottom: 12,
  },
  stopCardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  stopTitle: { color: FretixColors.white, fontSize: 15, fontWeight: '800', flex: 1 },
  stopType: { color: FretixColors.yellow, fontSize: 12, fontWeight: '700' },
  stopMeta: { color: '#CBD5E1', fontSize: 13, lineHeight: 18 },
  fab: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: BottomTabInset,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: FretixColors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  fabText: { color: '#101217', fontSize: 16, fontWeight: '800' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0F1720',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: BottomTabInset,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderColor: '#263242',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { color: FretixColors.white, fontSize: 18, fontWeight: '800' },
  formContent: { paddingBottom: 16 },
  fieldLabel: { color: FretixColors.white, fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 10 },
  typeRow: { gap: 8, paddingBottom: 4 },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#111824',
    borderWidth: 1,
    borderColor: '#273241',
  },
  typeChipActive: { backgroundColor: FretixColors.yellow, borderColor: FretixColors.yellow },
  typeChipText: { color: FretixColors.white, fontSize: 13, fontWeight: '600' },
  typeChipTextActive: { color: '#101217' },
  input: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#111824',
    borderWidth: 1,
    borderColor: '#273241',
    paddingHorizontal: 14,
    color: FretixColors.white,
  },
  textArea: { minHeight: 96, textAlignVertical: 'top', paddingTop: 14 },
  modalFooter: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: { color: FretixColors.white, fontSize: 15, fontWeight: '700' },
  saveButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: FretixColors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: { color: '#101217', fontSize: 15, fontWeight: '800' },
});
