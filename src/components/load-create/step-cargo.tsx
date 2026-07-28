import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { FretixColors } from '@/constants/theme';
import { LoadType, loadService } from '@/services/loads';
import { resolveLoadTypeImageUrl } from '@/utils/load-type-image';

import { MAX_PHOTOS } from './constants';
import { loadCreateStyles } from './styles';
import type { LoadCreateFormData } from './types';

// Optional import for expo-image-picker with fallback
let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (e) {
  console.log('expo-image-picker not installed, using fallback');
}

type StepCargoProps = {
  form: LoadCreateFormData;
  onChange: (patch: Partial<LoadCreateFormData>) => void;
  onShowDialog?: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
};

export function StepCargo({ form, onChange, onShowDialog }: StepCargoProps) {
  const [loadTypes, setLoadTypes] = useState<LoadType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLoadTypes = async () => {
      try {
        setLoading(true);
        const types = await loadService.getLoadTypes();
        console.log('[StepCargo] Fetched load types:', types);
        setLoadTypes(types);
        if (types.length === 0) return;

        const match = form.cargoTypeId
          ? types.find((type) => type.id === form.cargoTypeId)
          : null;

        if (match) {
          onChange({ cargoTypeLabel: match.label });
          return;
        }

        const first = types[0];
        onChange({ cargoTypeId: first.id, cargoTypeLabel: first.label });
      } catch (error) {
        console.error('Error fetching load types:', error);
        onShowDialog?.('Erro', 'Não foi possível carregar os tipos de carga.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchLoadTypes();
  }, []);

  const selectCargoType = (id: string, label: string) => {
    onChange({ cargoTypeId: id, cargoTypeLabel: label });
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...form.photos];
    newPhotos.splice(index, 1);
    onChange({ photos: newPhotos });
  };

  const addPhoto = async () => {
    if (form.photos.length >= MAX_PHOTOS) return;

    if (!ImagePicker) {
      onShowDialog?.('Aviso', 'A biblioteca de imagens não está instalada. Por favor, instale expo-image-picker.', 'info');
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        onShowDialog?.('Permissão necessária', 'Precisamos de acesso à sua galeria para adicionar fotos', 'info');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onChange({ photos: [...form.photos, result.assets[0].uri] });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      onShowDialog?.('Erro', 'Não foi possível selecionar a imagem', 'error');
    }
  };

  return (
    <View>
      <View style={loadCreateStyles.section}>
        <Text style={loadCreateStyles.sectionTitle}>1. Tipo de carga</Text>
        <Text style={loadCreateStyles.sectionHint}>Selecione o tipo da sua carga</Text>

        {loading ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator color={FretixColors.yellow} />
          </View>
        ) : (
          <View style={styles.grid}>
            {loadTypes.map((option) => {
              const selected = form.cargoTypeId === option.id;
              const iconName = option.icon || 'cube-outline';
              const imageUrl = resolveLoadTypeImageUrl(option.id, loadTypes);

              return (
                <Pressable
                  key={option.id}
                  onPress={() => selectCargoType(option.id, option.label)}
                  style={[styles.cargoCard, selected && styles.cargoCardSelected]}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.cargoImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.cargoIconWrap}>
                      <Ionicons 
                        name={iconName as any} 
                        size={28} 
                        color={selected ? FretixColors.yellow : FretixColors.grayLight} 
                      />
                    </View>
                  )}
                  <Text style={[styles.cargoLabel, selected && styles.cargoLabelSelected]} numberOfLines={1}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={loadCreateStyles.section}>
        <Text style={loadCreateStyles.sectionTitle}>2. Imagens da carga (opcional)</Text>
        <Text style={loadCreateStyles.sectionHint}>Adicione fotos da carga para mais detalhes</Text>

        <View style={styles.photosGrid}>
          {form.photos.map((photoUri, index) => (
            <View key={index} style={styles.photoItem}>
              <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
              <Pressable style={styles.removePhotoBtn} onPress={() => removePhoto(index)}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </Pressable>
            </View>
          ))}
          {form.photos.length < MAX_PHOTOS && (
            <Pressable style={styles.addPhotoBtn} onPress={addPhoto}>
              <Ionicons name="camera-outline" size={28} color={FretixColors.yellow} />
              <Text style={styles.addPhotoText}>Adicionar</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.photoCount}>
          {form.photos.length}/{MAX_PHOTOS} adicionadas
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  cargoCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#111723',
    borderWidth: 1.5,
    borderColor: '#273444',
    overflow: 'hidden',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cargoCardSelected: {
    borderColor: FretixColors.yellow,
    backgroundColor: '#1A1708',
  },
  cargoImage: {
    width: '100%',
    height: 60,
    borderRadius: 8,
  },
  cargoIconWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cargoLabel: {
    color: FretixColors.grayLight,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  cargoLabelSelected: {
    color: FretixColors.yellow,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  photoItem: {
    width: '30%',
    aspectRatio: 1,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  addPhotoBtn: {
    width: '30%',
    aspectRatio: 1,
    borderWidth: 1.5,
    borderColor: '#3D4654',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: {
    color: FretixColors.grayLight,
    fontSize: 12,
    fontWeight: '600',
  },
  photoCount: {
    color: FretixColors.grayLight,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});
