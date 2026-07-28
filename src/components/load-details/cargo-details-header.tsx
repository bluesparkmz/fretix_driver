import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FretixColors } from '@/constants/theme';
import { goBackSmart, useSmartBackHandler } from '@/utils/navigation';

type Props = {
  from?: string;
};

export function CargoDetailsHeader({ from }: Props) {
  useSmartBackHandler({ from, fallback: '/loads' });

  const handleBack = () => {
    goBackSmart({ from, fallback: '/loads' });
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={handleBack}
        style={styles.sideButton}
        accessibilityRole="button"
        accessibilityLabel="Voltar">
        <Ionicons name="arrow-back" size={22} color={FretixColors.white} />
      </Pressable>

      <Text style={styles.title} numberOfLines={1}>
        Detalhes da Carga
      </Text>

      <View style={styles.actions}>
        <Pressable style={styles.sideButton} accessibilityRole="button" accessibilityLabel="Partilhar">
          <Ionicons name="share-outline" size={20} color={FretixColors.white} />
        </Pressable>
        <Pressable style={styles.sideButton} accessibilityRole="button" accessibilityLabel="Guardar">
          <Ionicons name="bookmark-outline" size={20} color={FretixColors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sideButton: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: FretixColors.white,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
