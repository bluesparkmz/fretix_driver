import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FretixColors } from '@/constants/theme';
import { loadService } from '@/services/loads';
import { CustomDialog } from '@/components/custom-dialog';

import { CreateScreenHeader } from './create-screen-header';
import { StepCargo } from './step-cargo';
import { StepDetails } from './step-details';
import { StepRoute } from './step-route';
import { WEIGHT_UNIT_MAP } from './constants';
import { createDefaultLoadForm, type LoadCreateFormData } from './types';

const STEP_SUBTITLES = [
  'Informe o tipo de carga que deseja transportar.',
  'Informe o local de origem e destino da carga.',
  'Informe os detalhes da sua carga.',
] as const;

type Props = {
  loadId?: number | null;
  onPublishSuccess?: () => void;
};

const getWeightUnitLabel = (unit: string | null | undefined) => {
  if (unit === 'kg') return 'Quilogramas';
  return 'Toneladas';
};

export function LoadCreateWizard({ loadId, onPublishSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<LoadCreateFormData>(() => createDefaultLoadForm());
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info',
    onConfirm: () => setDialogVisible(false),
  });

  const isEdit = useMemo(() => typeof loadId === 'number' && Number.isFinite(loadId), [loadId]);

  const showDialog = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setDialogConfig({ title, message, type, onConfirm: () => setDialogVisible(false) });
    setDialogVisible(true);
  };

  const updateForm = (patch: Partial<LoadCreateFormData>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const resetWizard = () => {
    setForm(createDefaultLoadForm());
    setStep(1);
  };

  useEffect(() => {
    if (!isEdit || !loadId) return;

    const fetchLoad = async () => {
      try {
        setLoadingInitial(true);
        const data = await loadService.getLoadById(loadId);

        setForm((current) => ({
          ...current,
          cargoTypeId: data.load_type || current.cargoTypeId,
          cargoTypeLabel: data.load_type_label || current.cargoTypeLabel,
          origin: data.origin || current.origin,
          destination: data.destination || current.destination,
          departureDate: data.departure_date || current.departureDate,
          name: data.load_name || current.name,
          description: data.description || '',
          weight: data.weight != null ? String(data.weight) : '',
          weightUnit: getWeightUnitLabel(data.weight_unit),
          volume: data.volume != null ? String(data.volume) : '',
          value: data.value != null ? String(data.value) : '',
          specialInstructions: data.instructions || '',
          negotiable: Boolean(data.negotiable),
          loadFill: data.load_fill || current.loadFill,
          suggestedVehicleType: data.suggested_vehicle_type || current.suggestedVehicleType,
          originLat: data.origin_lat != null ? String(data.origin_lat) : current.originLat,
          originLng: data.origin_lng != null ? String(data.origin_lng) : current.originLng,
          destinationLat: data.destination_lat != null ? String(data.destination_lat) : current.destinationLat,
          destinationLng: data.destination_lng != null ? String(data.destination_lng) : current.destinationLng,
          photos: [],
        }));
      } catch (e) {
        console.error('Failed to fetch load for edit:', e);
        showDialog('Erro', 'Não foi possível carregar os dados da carga.', 'error');
      } finally {
        setLoadingInitial(false);
      }
    };

    fetchLoad();
  }, [isEdit, loadId]);

  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 2) {
      if (!form.origin.trim() || !form.destination.trim() || !form.departureDate.trim()) {
        showDialog('Origem e destino', 'Preencha origem, destino e data de saída.', 'info');
        return false;
      }
    }

    if (currentStep === 3) {
      if (!form.name.trim() || !form.weight.trim() || !form.value.trim()) {
        showDialog('Detalhes', 'Preencha nome, peso e valor da carga.', 'info');
        return false;
      }
    }

    return true;
  };

  const toNumber = (value: string | undefined | null) => {
    if (!value) return null;
    const cleaned = value.replace(/[^\d.]/g, '');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const goNext = async () => {
    if (!validateStep(step)) return;

    if (step < 3) {
      setStep((s) => s + 1);
      return;
    }

    try {
      setLoading(true);
      if (isEdit && loadId) {
        const patch = {
          load_type: form.cargoTypeId || undefined,
          load_name: form.name || undefined,
          description: form.description || undefined,
          weight: toNumber(form.weight) ?? undefined,
          weight_unit: WEIGHT_UNIT_MAP[form.weightUnit] || undefined,
          volume: toNumber(form.volume) ?? undefined,
          value: toNumber(form.value) ?? undefined,
          negotiable: form.negotiable,
          origin: form.origin || undefined,
          destination: form.destination || undefined,
          origin_lat: form.originLat ? Number.parseFloat(form.originLat) : undefined,
          origin_lng: form.originLng ? Number.parseFloat(form.originLng) : undefined,
          destination_lat: form.destinationLat ? Number.parseFloat(form.destinationLat) : undefined,
          destination_lng: form.destinationLng ? Number.parseFloat(form.destinationLng) : undefined,
          departure_date: form.departureDate || undefined,
          load_fill: form.loadFill || undefined,
          suggested_vehicle_type: form.suggestedVehicleType || undefined,
          instructions: form.specialInstructions || undefined,
        };

        await loadService.updateLoad(loadId, patch);

        router.replace({
          pathname: '/my_loads',
          params: { updated: '1' },
        });
      } else {
        const formData = new FormData();

        formData.append('load_type', form.cargoTypeId);
        formData.append('load_name', form.name);
        formData.append('description', form.description || '');
        formData.append('weight', String(toNumber(form.weight) ?? 0));
        formData.append('weight_unit', WEIGHT_UNIT_MAP[form.weightUnit] || 'ton');
        formData.append('volume', String(toNumber(form.volume) ?? 0));
        formData.append('value', String(toNumber(form.value) ?? 0));
        formData.append('negotiable', form.negotiable ? 'true' : 'false');
        formData.append('origin', form.origin);
        formData.append('destination', form.destination);
        if (form.originLat) formData.append('origin_lat', form.originLat);
        if (form.originLng) formData.append('origin_lng', form.originLng);
        if (form.destinationLat) formData.append('destination_lat', form.destinationLat);
        if (form.destinationLng) formData.append('destination_lng', form.destinationLng);
        formData.append('departure_date', form.departureDate);
        formData.append('load_fill', form.loadFill);
        if (form.suggestedVehicleType.trim()) {
          formData.append('suggested_vehicle_type', form.suggestedVehicleType.trim());
        }
        if (form.specialInstructions.trim()) {
          formData.append('instructions', form.specialInstructions.trim());
        }

        if (form.photos && Array.isArray(form.photos) && form.photos.length > 0) {
          form.photos.forEach((uri, index) => {
            if (!uri) return;
            const filename = `photo_${index + 1}.jpg`;
            const match = /\.(\w+)$/.exec(uri);
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            formData.append('images', { uri, name: filename, type } as any);
          });
        }

        await loadService.createLoad(formData);

        resetWizard();
        onPublishSuccess?.();

        router.replace({
          pathname: '/my_loads',
          params: { published: '1' },
        });
      }
    } catch (error: any) {
      console.error('Error saving load:', error);
      showDialog('Erro', error.response?.data?.detail || 'Falha ao publicar carga', 'error');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
      return;
    }
    router.back();
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <StepCargo form={form} onChange={updateForm} onShowDialog={showDialog} />;
      case 2:
        return <StepRoute form={form} onChange={updateForm} />;
      case 3:
        return <StepDetails form={form} onChange={updateForm} />;
      default:
        return null;
    }
  };

  const isLastStep = step === 3;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <CreateScreenHeader currentStep={step} />

        <Text style={styles.title}>{isEdit ? 'Editar carga' : 'Cadastrar nova carga'}</Text>
        <Text style={styles.subtitle}>{STEP_SUBTITLES[step - 1]}</Text>

        {loadingInitial ? (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator color={FretixColors.yellow} />
          </View>
        ) : (
          renderStep()
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.primaryButton} onPress={goNext} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#101217" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>
                {isLastStep ? (isEdit ? 'Salvar alterações' : 'Publicar carga') : 'Continuar'}
              </Text>
              <Ionicons
                name={isLastStep ? 'checkmark' : 'arrow-forward'}
                size={18}
                color="#101217"
              />
            </>
          )}
        </Pressable>

        {step > 1 && (
          <Pressable style={styles.secondaryButton} onPress={goBack} disabled={loading}>
            <Ionicons name="arrow-back" size={16} color={FretixColors.yellow} />
            <Text style={styles.secondaryButtonText}>Voltar</Text>
          </Pressable>
        )}
      </View>

      <CustomDialog
        visible={dialogVisible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        onConfirm={dialogConfig.onConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  title: {
    color: FretixColors.white,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 14,
  },
  subtitle: {
    color: FretixColors.grayLight,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 4,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    backgroundColor: FretixColors.black,
  },
  primaryButton: {
    backgroundColor: FretixColors.yellow,
    borderRadius: 14,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#101217',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: FretixColors.yellow,
    borderRadius: 14,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: FretixColors.yellow,
    fontSize: 15,
    fontWeight: '700',
  },
});
