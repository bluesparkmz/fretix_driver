import { Ionicons } from '@expo/vector-icons';
import { type Href, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FretixColors } from '@/constants/theme';
import { goBackSmart, useSmartBackHandler } from '@/utils/navigation';

type FlowScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  fallback?: Href;
};

export function FlowScreenHeader({ title, onBack, fallback = '/' }: FlowScreenHeaderProps) {
  const { returnTo, from } = useLocalSearchParams<{ returnTo?: string; from?: string }>();
  useSmartBackHandler({ returnTo, from, fallback });

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    goBackSmart({ returnTo, from, fallback });
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
        {title}
      </Text>

      <Pressable
        style={styles.sideButton}
        accessibilityRole="button"
        accessibilityLabel="Ajuda">
        <Ionicons name="help-circle-outline" size={22} color={FretixColors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sideButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: FretixColors.white,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
