import Constants from 'expo-constants';

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type GoogleRouteSuggestion = {
  coordinates: MapCoordinate[];
  distanceText: string;
  durationText: string;
  summary: string;
};

export type MozambiquePlacePrediction = {
  id: string;
  name: string;
  address: string;
  category?: 'fuel_station' | 'place';
};

export type MozambiquePlaceSuggestion = MozambiquePlacePrediction & {
  coordinate: MapCoordinate;
  neighborhood?: string;
  city?: string;
  district?: string;
  province?: string;
};

type GoogleAddressComponent = {
  long_name: string;
  short_name?: string;
  types?: string[];
};

const MAX_ROUTE_COORDINATES = 650;
const MAX_SEARCH_RESULTS = 15;
const MOZAMBIQUE_CENTER = { latitude: -18.6657, longitude: 35.5296 };

const getGoogleMapsApiKey = () => {
  const expoConfig = Constants.expoConfig as any;
  return (
    expoConfig?.extra?.googleMapsApiKey ||
    expoConfig?.android?.config?.googleMaps?.apiKey ||
    expoConfig?.ios?.config?.googleMapsApiKey ||
    ''
  );
};

const decodePolyline = (encoded: string): MapCoordinate[] => {
  const points: MapCoordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
};

const coordinatesMatch = (a: MapCoordinate, b: MapCoordinate) =>
  Math.abs(a.latitude - b.latitude) < 0.00001 && Math.abs(a.longitude - b.longitude) < 0.00001;

const limitRouteCoordinates = (coordinates: MapCoordinate[]) => {
  if (coordinates.length <= MAX_ROUTE_COORDINATES) return coordinates;

  const stride = Math.ceil(coordinates.length / MAX_ROUTE_COORDINATES);
  const sampled = coordinates.filter((_, index) => index === 0 || index === coordinates.length - 1 || index % stride === 0);
  const lastCoordinate = coordinates[coordinates.length - 1];

  return coordinatesMatch(sampled[sampled.length - 1], lastCoordinate)
    ? sampled
    : [...sampled, lastCoordinate];
};

const getDetailedRouteCoordinates = (leg: any, fallbackPolyline: string): MapCoordinate[] => {
  const stepCoordinates: MapCoordinate[] = Array.isArray(leg.steps)
    ? leg.steps.flatMap((step: any) => {
        const points = step.polyline?.points;
        return typeof points === 'string' ? decodePolyline(points) : [];
      })
    : [];

  if (stepCoordinates.length === 0) return limitRouteCoordinates(decodePolyline(fallbackPolyline));

  const dedupedCoordinates = stepCoordinates.filter((coordinate: MapCoordinate, index: number, coordinates: MapCoordinate[]) => {
    if (index === 0) return true;
    return !coordinatesMatch(coordinate, coordinates[index - 1]);
  });

  return limitRouteCoordinates(dedupedCoordinates);
};

const getComponentByTypes = (components: GoogleAddressComponent[], types: string[]) =>
  components.find((component) => component.types?.some((type) => types.includes(type)))?.long_name;

const buildMozambiquePlaceName = (result: any, fallback: string) => {
  const components: GoogleAddressComponent[] = Array.isArray(result.address_components)
    ? result.address_components
    : [];

  const neighborhood = getComponentByTypes(components, [
    'neighborhood',
    'sublocality',
    'sublocality_level_1',
    'sublocality_level_2',
    'premise',
    'point_of_interest',
    'route',
  ]);
  const locality = getComponentByTypes(components, ['locality']);
  const district = getComponentByTypes(components, ['administrative_area_level_2']);
  const province = getComponentByTypes(components, ['administrative_area_level_1']);

  const parts = [neighborhood || locality || fallback, district, province]
    .filter(Boolean)
    .filter((part, index, allParts) => allParts.indexOf(part) === index);

  return parts.length > 0 ? parts.join(', ') : result.formatted_address?.split(',')[0] || fallback;
};

const getMozambiquePlaceDetails = (result: any) => {
  const components: GoogleAddressComponent[] = Array.isArray(result.address_components)
    ? result.address_components
    : [];

  return {
    neighborhood: getComponentByTypes(components, [
      'neighborhood',
      'sublocality',
      'sublocality_level_1',
      'sublocality_level_2',
      'premise',
      'point_of_interest',
      'route',
    ]),
    city: getComponentByTypes(components, ['locality', 'administrative_area_level_3']),
    district: getComponentByTypes(components, ['administrative_area_level_2']),
    province: getComponentByTypes(components, ['administrative_area_level_1']),
  };
};

const isFuelStationQuery = (query: string) => {
  const normalizedQuery = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return ['bomba', 'bombas', 'combustivel', 'gasolina', 'diesel', 'posto', 'fuel', 'gas station']
    .some((term) => normalizedQuery.includes(term));
};

const mapPlaceResult = (result: any, fallbackName: string): MozambiquePlaceSuggestion | null => {
  const location = result.geometry?.location;
  if (!location) return null;

  const isFuelStation = result.types?.includes('gas_station');

  return {
    id: result.place_id,
    name: buildMozambiquePlaceName(result, result.name || fallbackName),
    address: result.formatted_address || 'Mocambique',
    coordinate: {
      latitude: location.lat,
      longitude: location.lng,
    },
    category: isFuelStation ? 'fuel_station' : 'place',
    ...getMozambiquePlaceDetails(result),
  };
};

export const googleMapsService = {
  async getDrivingRouteSuggestions(
    origin: MapCoordinate,
    destination: MapCoordinate
  ): Promise<GoogleRouteSuggestion[]> {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) return [];

    const params = new URLSearchParams({
      origin: `${origin.latitude},${origin.longitude}`,
      destination: `${destination.latitude},${destination.longitude}`,
      mode: 'driving',
      alternatives: 'true',
      key: apiKey,
    });

    const response = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Google Directions failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.status !== 'OK' || !Array.isArray(data.routes)) {
      throw new Error(data.error_message || `Google Directions returned ${data.status}`);
    }

    return data.routes
      .map((route: any) => {
        const leg = route.legs?.[0];
        const encodedPolyline = route.overview_polyline?.points;

        if (!leg || !encodedPolyline) return null;

        return {
          coordinates: getDetailedRouteCoordinates(leg, encodedPolyline),
          distanceText: leg.distance?.text ?? '',
          durationText: leg.duration?.text ?? '',
          summary: route.summary ?? 'Google Maps',
        };
      })
      .filter((route: GoogleRouteSuggestion | null): route is GoogleRouteSuggestion => route !== null);
  },

  async searchMozambiquePlaces(query: string): Promise<MozambiquePlacePrediction[]> {
    const apiKey = getGoogleMapsApiKey();
    const trimmedQuery = query.trim();
    if (!apiKey || trimmedQuery.length < 2) return [];

    const autocompleteParams = new URLSearchParams({
      input: trimmedQuery,
      components: 'country:mz',
      language: 'pt',
      region: 'mz',
      location: `${MOZAMBIQUE_CENTER.latitude},${MOZAMBIQUE_CENTER.longitude}`,
      radius: '2000000',
      key: apiKey,
    });

    if (isFuelStationQuery(trimmedQuery)) {
      autocompleteParams.set('types', 'gas_station');
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${autocompleteParams.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Google Places Autocomplete failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(data.error_message || `Google Places Autocomplete returned ${data.status}`);
    }

    return (data.predictions ?? []).slice(0, MAX_SEARCH_RESULTS).map((prediction: any) => ({
      id: prediction.place_id,
      name: prediction.structured_formatting?.main_text || prediction.description,
      address: prediction.structured_formatting?.secondary_text || prediction.description,
      category: prediction.types?.includes('gas_station') ? 'fuel_station' as const : 'place' as const,
    }));
  },

  async getPlaceDetails(placeId: string): Promise<MozambiquePlaceSuggestion | null> {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey || !placeId) return null;

    const params = new URLSearchParams({
      place_id: placeId,
      fields: 'place_id,name,formatted_address,geometry,address_components,types',
      language: 'pt',
      key: apiKey,
    });

    const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Google Place Details failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.status !== 'OK' || !data.result) {
      if (data.status === 'NOT_FOUND') return null;
      throw new Error(data.error_message || `Google Place Details returned ${data.status}`);
    }

    return mapPlaceResult(data.result, data.result.name || placeId);
  },

  async reverseGeocodeMozambiqueCoordinate(coordinate: MapCoordinate): Promise<MozambiquePlaceSuggestion | null> {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) return null;

    const params = new URLSearchParams({
      latlng: `${coordinate.latitude},${coordinate.longitude}`,
      result_type:
        'street_address|route|neighborhood|sublocality|locality|administrative_area_level_3|administrative_area_level_2|administrative_area_level_1',
      location_type: 'ROOFTOP|RANGE_INTERPOLATED|GEOMETRIC_CENTER|APPROXIMATE',
      language: 'pt',
      key: apiKey,
    });

    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Google Reverse Geocoding failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
      if (data.status === 'ZERO_RESULTS') return null;
      throw new Error(data.error_message || `Google Reverse Geocoding returned ${data.status}`);
    }

    const mozambiqueResult =
      data.results.find((result: any) =>
        result.address_components?.some((component: GoogleAddressComponent) =>
          component.types?.includes('country') && component.short_name === 'MZ'
        )
      ) ?? data.results[0];

    return {
      id: mozambiqueResult.place_id,
      name: buildMozambiquePlaceName(mozambiqueResult, `${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}`),
      address: mozambiqueResult.formatted_address,
      coordinate,
      ...getMozambiquePlaceDetails(mozambiqueResult),
    };
  },
};
