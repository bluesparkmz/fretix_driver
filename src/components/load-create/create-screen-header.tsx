import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FretixColors } from '@/constants/theme';

import { LoadCreateStepper } from './load-create-stepper';

type CreateScreenHeaderProps = {
  currentStep: number;
};

export function CreateScreenHeader({ currentStep }: CreateScreenHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={22} color={FretixColors.white} />
        </Pressable>

        <View style={styles.titleSlot}>
          <Text style={styles.logoText} numberOfLines={1}>
            Fret<Text style={styles.logoAccent}>ix</Text>
          </Text>
        </View>

        <View style={styles.backPlaceholder} />
      </View>

      <LoadCreateStepper currentStep={currentStep} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  backPlaceholder: {
    width: 40,
  },
  logoText: {
    color: FretixColors.white,
    fontSize: 24,
    fontWeight: '700',
  },
  logoAccent: {
    color: FretixColors.yellow,
  },
});
