import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FretixColors } from '@/constants/theme';
import { LoadFillType, loadService } from '@/services/loads';

import { MAX_TEXT_LENGTH, WEIGHT_UNITS } from './constants';
import { loadCreateStyles } from './styles';
import type { LoadCreateFormData } from './types';

type StepDetailsProps = {
  form: LoadCreateFormData;
  onChange: (patch: Partial<LoadCreateFormData>) => void;
};

export function StepDetails({ form, onChange }: StepDetailsProps) {
  const [loadFillTypes, setLoadFillTypes] = useState<LoadFillType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLoadFillTypes = async () => {
      try {
        setLoading(true);
        const types = await loadService.getLoadFillTypes();
        setLoadFillTypes(types);
        if (types.length > 0 && !form.loadFill) {
          onChange({ loadFill: types[0].id });
        }
      } catch (error) {
        console.error('Error fetching load fill types:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLoadFillTypes();
  }, []);

  const cycleWeightUnit = () => {
    const currentIndex = WEIGHT_UNITS.indexOf(form.weightUnit as (typeof WEIGHT_UNITS)[number]);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % WEIGHT_UNITS.length : 0;
    onChange({ weightUnit: WEIGHT_UNITS[nextIndex] });
  };

  const summaryRows = [
    { label: 'Tipo de carga', value: form.cargoTypeLabel },
    { label: 'Origem', value: form.origin },
    { label: 'Destino', value: form.destination },
    { label: 'Data de saída', value: form.departureDate },
    { label: 'Peso', value: `${form.weight} ${form.weightUnit}`.trim() },
    { label: 'Valor da carga', value: `${form.value} MT` },
  ];

  return (
    <View>
      <View style={loadCreateStyles.section}>
        <Text style={loadCreateStyles.sectionTitle}>1. Nome da carga</Text>
        <Text style={loadCreateStyles.sectionHint}>Ex.: Areia lavada, Cimento, Gasolina, etc.</Text>
        <TextInput
          style={loadCreateStyles.input}
          value={form.name}
          onChangeText={(name) => onChange({ name })}
          placeholder="Nome da carga"
          placeholderTextColor="#6B7280"
        />
      </View>

      <View style={loadCreateStyles.section}>
        <Text style={loadCreateStyles.sectionTitle}>2. Descrição da carga (opcional)</Text>
        <View>
          <TextInput
            style={loadCreateStyles.textArea}
            value={form.description}
            onChangeText={(description) => onChange({ description })}
            placeholder="Descreva a carga..."
            placeholderTextColor="#6B7280"
            multiline
            maxLength={MAX_TEXT_LENGTH}
          />
          <Text style={loadCreateStyles.charCount}>
            {form.description.length}/{MAX_TEXT_LENGTH}
          </Text>
        </View>
      </View>

      <View style={loadCreateStyles.section}>
        <Text style={loadCreateStyles.sectionTitle}>3. Peso total</Text>
        <View style={styles.splitRow}>
          <TextInput
            style={[loadCreateStyles.input, styles.splitInput]}
            value={form.weight}
            onChangeText={(weight) => onChange({ weight })}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#6B7280"
          />
          <Pressable style={styles.unitPicker} onPress={cycleWeightUnit}>
            <Text style={styles.unitPickerText}>{form.weightUnit}</Text>
            <Ionicons name="chevron-down" size={16} color={FretixColors.grayLight} />
          </Pressable>
        </View>
      </View>

      <View style={loadCreateStyles.section}>
        <Text style={loadCreateStyles.sectionTitle}>4. Volume (opcional)</Text>
        <View style={styles.splitRow}>
          <TextInput
            style={[loadCreateStyles.input, styles.splitInput]}
            value={form.volume}
            onChangeText={(volume) => onChange({ volume })}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#6B7280"
          />
          <View style={styles.unitStatic}>
            <Text style={styles.unitStaticText}>m³</Text>
          </View>
        </View>
      </View>

      <View style={loadCreateStyles.section}>
        <Text style={loadCreateStyles.sectionTitle}>5. Valor da carga</Text>
        <View style={loadCreateStyles.inputRow}>
          <TextInput
            style={loadCreateStyles.inputRowField}
            value={form.value}
            onChangeText={(value) => onChange({ value })}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#6B7280"
          />
          <Text style={styles.currency}>MT</Text>
        </View>
      </View>

      <View style={loadCreateStyles.section}>
        <Text style={loadCreateStyles.sectionTitle}>6. Tipo de carga</Text>
        <Text style={loadCreateStyles.sectionHint}>Carga completa ou meia carga?</Text>

        {loading ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator color={FretixColors.yellow} />
          </View>
        ) : (
          <View style={styles.loadFillRow}>
            {loadFillTypes.map((option) => (
              <Pressable
                key={option.id}
                style={[styles.loadFillOption, form.loadFill === option.id && styles.loadFillOptionSelected]}
                onPress={() => onChange({ loadFill: option.id })}
              >
                <Text style={[styles.loadFillText, form.loadFill === option.id && styles.loadFillTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={loadCreateStyles.section}>
        <Text style={loadCreateStyles.sectionTitle}>7. Valor negociável?</Text>
        <View style={styles.negotiableRow}>
          <Pressable
            style={[styles.negotiableOption, form.negotiable && styles.negotiableOptionSelected]}
            onPress={() => onChange({ negotiable: true })}
          >
            <Text style={[styles.negotiableText, form.negotiable && styles.negotiableTextSelected]}>Sim</Text>
          </Pressable>
          <Pressable
            style={[styles.negotiableOption, !form.negotiable && styles.negotiableOptionSelected]}
            onPress={() => onChange({ negotiable: false })}
          >
            <Text style={[styles.negotiableText, !form.negotiable && styles.negotiableTextSelected]}>Não</Text>
          </Pressable>
        </View>
      </View>

      <View style={loadCreateStyles.section}>
        <Text style={loadCreateStyles.sectionTitle}>8. Instruções especiais (opcional)</Text>
        <View>
          <TextInput
            style={loadCreateStyles.textArea}
            value={form.specialInstructions}
            onChangeText={(specialInstructions) => onChange({ specialInstructions })}
            placeholder="Instruções para o transportador..."
            placeholderTextColor="#6B7280"
            multiline
            maxLength={MAX_TEXT_LENGTH}
          />
          <Text style={loadCreateStyles.charCount}>
            {form.specialInstructions.length}/{MAX_TEXT_LENGTH}
          </Text>
        </View>
      </View>

      <View style={loadCreateStyles.section}>
        <Text style={loadCreateStyles.sectionTitle}>Resumo da carga</Text>
        <View style={loadCreateStyles.summaryCard}>
          {summaryRows.map((row) => (
            <View key={row.label} style={loadCreateStyles.summaryRow}>
              <Text style={loadCreateStyles.summaryLabel}>{row.label}</Text>
              <Text style={loadCreateStyles.summaryValue} numberOfLines={2}>
                {row.value || '—'}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  splitRow: {
    flexDirection: 'row',
    gap: 8,
  },
  splitInput: {
    flex: 1,
  },
  unitPicker: {
    minWidth: 120,
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  unitPickerText: {
    color: FretixColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  unitStatic: {
    minWidth: 56,
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitStaticText: {
    color: FretixColors.grayLight,
    fontSize: 14,
    fontWeight: '600',
  },
  currency: {
    color: FretixColors.grayLight,
    fontSize: 14,
    fontWeight: '700',
    paddingRight: 4,
  },
  loadFillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  loadFillOption: {
    flex: 1,
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  loadFillOptionSelected: {
    backgroundColor: FretixColors.yellow,
    borderColor: FretixColors.yellow,
  },
  loadFillText: {
    color: FretixColors.grayLight,
    fontSize: 14,
    fontWeight: '600',
  },
  loadFillTextSelected: {
    color: '#101217',
    fontWeight: '700',
  },
  negotiableRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  negotiableOption: {
    flex: 1,
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  negotiableOptionSelected: {
    backgroundColor: FretixColors.yellow,
    borderColor: FretixColors.yellow,
  },
  negotiableText: {
    color: FretixColors.grayLight,
    fontSize: 14,
    fontWeight: '600',
  },
  negotiableTextSelected: {
    color: '#101217',
    fontWeight: '700',
  },
});
