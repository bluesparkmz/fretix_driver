import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo } from 'react';
import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';

import { FretixColors } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';
import { resolveLoadTypeImageUrl } from '@/utils/load-type-image';

type LoadTypeImageProps = {
  loadType: string;
  style?: StyleProp<ImageStyle>;
  fallbackIconSize?: number;
};

export function LoadTypeImage({
  loadType,
  style,
  fallbackIconSize = 24,
}: LoadTypeImageProps) {
  const { loadTypes, loadLoadTypesIfNeeded } = useAppData();

  useEffect(() => {
    loadLoadTypesIfNeeded();
  }, [loadLoadTypesIfNeeded]);

  const imageUrl = useMemo(
    () => resolveLoadTypeImageUrl(loadType, loadTypes.data),
    [loadType, loadTypes.data]
  );

  if (imageUrl) {
    return <Image source={{ uri: imageUrl }} style={style} resizeMode="cover" />;
  }

  return (
    <View style={[style, styles.fallback]}>
      <Ionicons name="cube-outline" size={fallbackIconSize} color={FretixColors.grayLight} />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D1118',
  },
});
