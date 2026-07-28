import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FretixColors } from '@/constants/theme';

import { LocationPicker } from './location-picker';
import { loadCreateStyles } from './styles';
import type { LoadCreateFormData } from './types';

type StepRouteProps = {
  form: LoadCreateFormData;
  onChange: (patch: Partial<LoadCreateFormData>) => void;
};

export function StepRoute({ form, onChange }: StepRouteProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  return (
    <View>
      <LocationPicker
        title="1. Origem"
        hint="De onde a carga sairá?"
        value={form.origin}
        zIndex={20}
        onSelect={(place, lat, lng) =>
          onChange({ origin: place, originLat: lat, originLng: lng })
        }
      />

      <LocationPicker
        title="2. Destino"
        hint="Para onde a carga será entregue?"
        value={form.destination}
        zIndex={10}
        onSelect={(place, lat, lng) =>
          onChange({ destination: place, destinationLat: lat, destinationLng: lng })
        }
      />

      <View style={loadCreateStyles.section}>
        <Text style={loadCreateStyles.sectionTitle}>3. Data de saída desejada</Text>
        <Text style={loadCreateStyles.sectionHint}>Quando a carga estará pronta para coleta?</Text>

        <Pressable
          style={loadCreateStyles.inputRow}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={18} color={FretixColors.grayLight} />
          <Text style={[
            loadCreateStyles.inputRowField,
            !form.departureDate && { color: '#6B7280' }
          ]}>
            {form.departureDate || 'Selecione uma data'}
          </Text>
        </Pressable>

        {showDatePicker && (
          <DateTimePicker
            value={form.departureDate ? new Date(form.departureDate) : new Date()}
            mode="date"
            display="default"
            onValueChange={(event, selectedDate) => {
              if (selectedDate) {
                const year = selectedDate.getFullYear();
                const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
                const day = selectedDate.getDate().toString().padStart(2, '0');
                onChange({ departureDate: `${year}-${month}-${day}` });
              }
              setShowDatePicker(false);
            }}
            minimumDate={new Date()}
          />
        )}
      </View>

      <View style={styles.mapCard}>
        <View style={styles.mapOverlay}>
          <View style={styles.mapPinRow}>
            <View style={styles.originPin}>
              <Ionicons name="location" size={14} color="#101217" />
            </View>
            <View style={styles.locationTextWrap}>
              <Text style={styles.locationTag}>ORIGEM</Text>
              <Text style={styles.mapCity} numberOfLines={1}>
                {form.origin || 'Selecione a origem'}
              </Text>
            </View>
          </View>

          <View style={styles.routeLineVertical}>
            <View style={styles.routeDot} />
            <View style={styles.routeDashVertical} />
            <View style={styles.routeDot} />
          </View>

          <View style={styles.mapPinRow}>
            <View style={styles.destPin}>
              <Ionicons name="location" size={14} color={FretixColors.white} />
            </View>
            <View style={styles.locationTextWrap}>
              <Text style={styles.locationTag}>DESTINO</Text>
              <Text style={styles.mapCity} numberOfLines={1}>
                {form.destination || 'Selecione o destino'}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.mapHint}>Pré-visualização da rota</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapCard: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: '#0D1520',
    borderWidth: 1,
    borderColor: '#273444',
    overflow: 'hidden',
  },
  mapOverlay: {
    padding: 18,
    backgroundColor: '#121C2A',
  },
  mapPinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  originPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: FretixColors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  locationTag: {
    color: FretixColors.grayLight,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  mapCity: {
    color: FretixColors.white,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  routeLineVertical: {
    paddingLeft: 12,
    marginVertical: 4,
    alignItems: 'center',
    width: 28,
    gap: 3,
  },
  routeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: FretixColors.yellow,
  },
  routeDashVertical: {
    width: 2,
    height: 20,
    borderRadius: 1,
    backgroundColor: FretixColors.yellow,
    opacity: 0.6,
  },
  mapHint: {
    color: '#6B7280',
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 8,
    backgroundColor: '#0B0F14',
  },
});
