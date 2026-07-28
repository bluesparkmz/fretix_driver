import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomDialog } from '@/components/custom-dialog';
import { FlowScreenHeader } from '@/components/wallet/flow-screen-header';
import { FretixColors } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';
import { driverService, type Driver } from '@/services/drivers';
import { LoadDetail, loadService } from '@/services/loads';
import { proposalService } from '@/services/proposals';
import { vehicleService, type Vehicle } from '@/services/vehicles';

const deliveryOptions = ['2 dias', '3 dias', '5 dias'];

function formatAmount(value: string) {
  const amount = Number(value.replace(',', '.'));
  if (!Number.isFinite(amount)) return '0,00 MT';
  return `${amount.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT`;
}

export function CreateProposalScreen({ loadId }: { loadId: number | null }) {
  const { refreshMyProposals } = useAppData();
  const [amount, setAmount] = useState('24500');
  const [deliveryIndex, setDeliveryIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [showDeliveryPicker, setShowDeliveryPicker] = useState(false);
  const [load, setLoad] = useState<LoadDetail | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const displayAmount = formatAmount(amount);
  const clientIndicatedValue = load?.value ?? null;

  const clientValueLabel =
    clientIndicatedValue != null
      ? `${clientIndicatedValue.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT`
      : null;

  useEffect(() => {
    if (!loadId) return;

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [data, vehicles, drivers] = await Promise.all([
          loadService.getLoadById(loadId),
          vehicleService.getMyVehicles(),
          driverService.getMyDrivers(),
        ]);
        setLoad(data);
        if (data.value != null) {
          setAmount(String(Math.round(data.value)));
        }

        const fallbackDriver = drivers[0] ?? null;
        const vehicleWithDriver = vehicles.find((vehicle) => vehicle.driver_id != null);
        const vehicle = vehicleWithDriver ?? vehicles[0] ?? null;
        const driver = vehicle?.driver_id
          ? drivers.find((item) => item.id === vehicle.driver_id) ?? fallbackDriver
          : fallbackDriver;

        setSelectedVehicle(vehicle);
        setSelectedDriver(driver);
      } catch (error: any) {
        console.error('Failed to load proposal cargo:', error.response?.data || error.message);
        setDialogConfig({
          visible: true,
          title: 'Erro',
          message: error.response?.data?.detail || 'Não foi possível carregar a carga.',
          type: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [loadId]);

  const handleSubmit = async () => {
    if (!loadId) {
      setDialogConfig({
        visible: true,
        title: 'Carga',
        message: 'Abra a proposta a partir dos detalhes de uma carga.',
        type: 'info',
      });
      return;
    }

    const proposedValue = Number(amount.replace(',', '.'));
    if (!Number.isFinite(proposedValue) || proposedValue <= 0) {
      setDialogConfig({
        visible: true,
        title: 'Valor',
        message: 'Informe um valor válido para a proposta.',
        type: 'info',
      });
      return;
    }
    if (clientIndicatedValue != null && proposedValue < clientIndicatedValue) {
      setDialogConfig({
        visible: true,
        title: 'Valor mínimo',
        message: `A proposta deve ser pelo menos ${clientIndicatedValue.toLocaleString('pt-MZ')} MT (valor indicado pelo dono da carga).`,
        type: 'info',
      });
      return;
    }
    if (!selectedDriver || !selectedVehicle) {
      setDialogConfig({
        visible: true,
        title: 'Frota',
        message: 'Cadastre um camião e um motorista antes de enviar proposta.',
        type: 'info',
      });
      return;
    }

    try {
      setSubmitting(true);
      await proposalService.createProposal(loadId, {
        proposed_value: proposedValue,
        message: message.trim() || null,
        driver_id: selectedDriver.id,
        vehicle_id: selectedVehicle.id,
      });
      await refreshMyProposals();
      setDialogConfig({
        visible: true,
        title: 'Proposta enviada',
        message: 'A sua proposta foi enviada com sucesso.',
        type: 'success',
        onConfirm: () => {
          setDialogConfig((prev) => ({ ...prev, visible: false }));
          router.replace('/my-proposals');
        },
      });
    } catch (error: any) {
      console.error('Failed to create proposal:', error.response?.data || error.message);
      setDialogConfig({
        visible: true,
        title: 'Erro',
        message: error.response?.data?.detail || 'Não foi possível enviar a proposta.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <FlowScreenHeader title="Nova proposta" />

          <View style={styles.cargoCard}>
            {loading ? (
              <ActivityIndicator color={FretixColors.yellow} />
            ) : load ? (
              <>
                <Text style={styles.cargoId}>#{load.code} - {load.load_name}</Text>
                <Text style={styles.cargoRoute}>{load.origin} -&gt; {load.destination}</Text>
                <Text style={styles.cargoMeta}>
                  {load.weight} {load.weight_unit}
                </Text>
                {clientValueLabel ? (
                  <Text style={styles.clientValue}>
                    Valor indicado pelo cliente: {clientValueLabel}
                  </Text>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.cargoId}>Carga nao selecionada</Text>
                <Text style={styles.cargoRoute}>Abra esta tela pelos detalhes da carga</Text>
              </>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>O seu preco de proposta</Text>
            {clientValueLabel ? (
              <Text style={styles.fieldHint}>
                Minimo: {clientValueLabel} (nao pode ser inferior ao valor indicado)
              </Text>
            ) : (
              <Text style={styles.fieldHint}>Defina o valor que a sua empresa cobra por este transporte</Text>
            )}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#6B7280"
              />
              <Text style={styles.suffix}>MT</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Prazo de entrega</Text>
            <Pressable
              style={styles.selectRow}
              onPress={() => setShowDeliveryPicker((value) => !value)}
              accessibilityRole="button">
              <Text style={styles.selectValue}>{deliveryOptions[deliveryIndex]}</Text>
              <Ionicons name="chevron-down" size={18} color={FretixColors.grayLight} />
            </Pressable>
            {showDeliveryPicker && (
              <View style={styles.pickerList}>
                {deliveryOptions.map((option, index) => (
                  <Pressable
                    key={option}
                    style={[styles.pickerItem, index < deliveryOptions.length - 1 && styles.pickerBorder]}
                    onPress={() => {
                      setDeliveryIndex(index);
                      setShowDeliveryPicker(false);
                    }}>
                    <Text style={[styles.pickerItemText, deliveryIndex === index && styles.pickerItemTextActive]}>
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Observacoes (opcional)</Text>
              <Text style={styles.charCount}>{message.length}/200</Text>
            </View>
            <TextInput
              style={styles.textArea}
              value={message}
              onChangeText={(text) => setMessage(text.slice(0, 200))}
              placeholder="Nota breve sobre a proposta (ex.: prazo ou tipo de veiculo)..."
              placeholderTextColor="#6B7280"
              multiline
              maxLength={200}
            />
          </View>

          <View style={styles.fleetCard}>
            <View style={styles.fleetHeader}>
              <Ionicons name="bus-outline" size={18} color={FretixColors.yellow} />
              <Text style={styles.fleetTitle}>Frota usada</Text>
            </View>
            {selectedVehicle && selectedDriver ? (
              <>
                <Text style={styles.fleetMain}>
                  {[selectedVehicle.brand, selectedVehicle.model_name].filter(Boolean).join(' ') || 'Camiao'} - {selectedVehicle.plate}
                </Text>
                <Text style={styles.fleetMeta}>Motorista: {selectedDriver.name}</Text>
              </>
            ) : (
              <Text style={styles.fleetMeta}>
                Cadastre ou vincule um motorista a um camiao antes de enviar proposta.
              </Text>
            )}
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Voce recebera</Text>
            <Text style={styles.summaryValue}>{displayAmount}</Text>
            <Text style={styles.summaryHint}>Valor liquido apos taxas da plataforma (estimativa)</Text>
          </View>

          <Pressable
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            accessibilityRole="button">
            {submitting ? (
              <ActivityIndicator color="#101217" />
            ) : (
              <Text style={styles.submitText}>Enviar proposta</Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
      <CustomDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        onConfirm={() => {
          if (dialogConfig.onConfirm) {
            dialogConfig.onConfirm();
          } else {
            setDialogConfig((prev) => ({ ...prev, visible: false }));
          }
        }}
      />
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
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 16,
  },
  cargoCard: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    padding: 14,
    gap: 4,
    marginTop: 4,
  },
  cargoId: {
    color: FretixColors.yellow,
    fontSize: 12,
    fontWeight: '700',
  },
  cargoRoute: {
    color: FretixColors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  cargoMeta: {
    color: FretixColors.grayLight,
    fontSize: 12,
  },
  clientValue: {
    color: FretixColors.yellow,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  fieldHint: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 17,
  },
  field: {
    gap: 8,
  },
  label: {
    color: FretixColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    color: '#6B7280',
    fontSize: 11,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: FretixColors.white,
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 14,
  },
  suffix: {
    color: FretixColors.grayLight,
    fontSize: 14,
    fontWeight: '600',
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectValue: {
    color: FretixColors.white,
    fontSize: 14,
    flex: 1,
  },
  pickerList: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
  },
  pickerItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#273444',
  },
  pickerItemText: {
    color: FretixColors.grayLight,
    fontSize: 14,
  },
  pickerItemTextActive: {
    color: FretixColors.yellow,
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    color: FretixColors.white,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  fleetCard: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  fleetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fleetTitle: {
    color: FretixColors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  fleetMain: {
    color: FretixColors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  fleetMeta: {
    color: FretixColors.grayLight,
    fontSize: 12,
    lineHeight: 17,
  },
  summaryBox: {
    backgroundColor: '#1A1708',
    borderWidth: 1,
    borderColor: FretixColors.yellow,
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  summaryLabel: {
    color: FretixColors.grayLight,
    fontSize: 12,
  },
  summaryValue: {
    color: FretixColors.yellow,
    fontSize: 24,
    fontWeight: '800',
  },
  summaryHint: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: FretixColors.yellow,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: '#101217',
    fontSize: 16,
    fontWeight: '700',
  },
});
