import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FretixColors } from '@/constants/theme';
import { googleMapsService, type MozambiquePlacePrediction } from '@/services/google-maps';

type LocationPickerProps = {
  title: string;
  hint: string;
  value: string;
  onSelect: (place: string, lat: string, lng: string) => void;
  zIndex?: number;
};

export function LocationPicker({ title, hint, value, onSelect, zIndex = 10 }: LocationPickerProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [query, setQuery] = useState(value);
  const [searchResults, setSearchResults] = useState<MozambiquePlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolvingSelection, setIsResolvingSelection] = useState(false);

  useEffect(() => {
    if (value !== query && !isFocused) {
      setQuery(value);
    }
  }, [value, isFocused, query]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!isFocused || trimmedQuery.length < 2 || (value === query && !isFocused)) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    const timeout = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await googleMapsService.searchMozambiquePlaces(trimmedQuery);
        if (active) {
          setSearchResults(results);
        }
      } catch (error) {
        console.warn('Mozambique place search failed:', error);
        if (active) {
          setSearchResults([]);
        }
      } finally {
        if (active) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [isFocused, query, value]);

  const handleSelect = async (place: MozambiquePlacePrediction) => {
    setIsFocused(false);
    Keyboard.dismiss();

    try {
      setIsResolvingSelection(true);
      const resolved = await googleMapsService.getPlaceDetails(place.id);
      if (resolved) {
        setQuery(resolved.name);
        onSelect(resolved.name, String(resolved.coordinate.latitude), String(resolved.coordinate.longitude));
        return;
      }
    } catch (error) {
      console.warn('Failed to resolve place details:', error);
    } finally {
      setIsResolvingSelection(false);
    }

    setQuery(place.name);
    onSelect(place.name, '', '');
  };

  const handleChangeText = (text: string) => {
    setQuery(text);
    onSelect(text, '', '');
  };

  const showDropdown = isFocused && query.trim().length >= 2;

  return (
    <View style={[styles.section, { zIndex }]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionHint}>{hint}</Text>

      <View style={[styles.inputWrap, isFocused && styles.inputWrapFocused]}>
        <Ionicons
          name="location-outline"
          size={18}
          color={isFocused ? FretixColors.yellow : FretixColors.grayLight}
        />
        <TextInput
          style={styles.input}
          placeholder="Pesquisar bairro, rua, cidade..."
          placeholderTextColor="#6B7280"
          value={query}
          onChangeText={handleChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setTimeout(() => setIsFocused(false), 200);
          }}
        />
        {isSearching || isResolvingSelection ? (
          <ActivityIndicator size="small" color={FretixColors.yellow} />
        ) : query.length > 0 ? (
          <Pressable onPress={() => handleChangeText('')} style={styles.clearBtn} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={FretixColors.grayLight} />
          </Pressable>
        ) : null}
      </View>

      {showDropdown && (
        <View style={styles.dropdown}>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.dropdownScroll}>
            {searchResults.map((place, index) => (
              <Pressable
                key={place.id}
                style={[styles.suggestionRow, index > 0 && styles.suggestionBorder]}
                onPress={() => handleSelect(place)}
              >
                <View style={styles.iconWrap}>
                  <Ionicons
                    name={place.category === 'fuel_station' ? 'car' : 'map-outline'}
                    size={16}
                    color={FretixColors.yellow}
                  />
                </View>
                <View style={styles.suggestionTexts}>
                  <Text style={styles.suggestionTitle}>{place.name}</Text>
                  <Text style={styles.suggestionSubtitle}>{place.address}</Text>
                </View>
              </Pressable>
            ))}

            {searchResults.length === 0 && !isSearching && (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>Nenhum local em Mocambique encontrado</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
    gap: 8,
  },
  sectionTitle: {
    color: FretixColors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHint: {
    color: FretixColors.grayLight,
    fontSize: 12,
    marginBottom: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputWrapFocused: {
    borderColor: FretixColors.yellow,
  },
  input: {
    flex: 1,
    color: FretixColors.white,
    fontSize: 14,
    height: 48,
    paddingHorizontal: 8,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  dropdown: {
    position: 'absolute',
    top: 86,
    left: 0,
    right: 0,
    backgroundColor: '#151D2B',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 12,
    zIndex: 9999,
    elevation: 10,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 240,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  suggestionBorder: {
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionTexts: {
    flex: 1,
  },
  suggestionTitle: {
    color: FretixColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionSubtitle: {
    color: FretixColors.grayLight,
    fontSize: 12,
    marginTop: 2,
  },
  emptyRow: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: FretixColors.grayLight,
    fontSize: 13,
  },
});
