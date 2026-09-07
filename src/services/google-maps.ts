import Constants from 'expo-constants';

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type GoogleRouteSuggestion = {
  coordinates: MapCoordinate[];
  steps: GoogleRouteStep[];
  distanceText: string;
  durationText: string;
  summary: string;
};

type RouteEndpoint = MapCoordinate | string;

export type GoogleRouteStep = {
  instruction: string;
  distanceText: string;
  durationText: string;
  maneuver?: string;
  startLocation: MapCoordinate;
  endLocation: MapCoordinate;
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

export type NearbyPlaceLabel = {
  id: string;
  name: string;
  coordinate: MapCoordinate;
  category: string;
};

type GoogleAddressComponent = {
  long_name: string;
  short_name?: string;
  types?: string[];
};

// 650 pontos era pouco para rotas longas: em 1.000+ km ligava pontos muito
// distantes e visualmente "cortava" casas e curvas. Mantemos muito mais
// detalhe e simplificamos pela forma da estrada, não por amostragem uniforme.
const TARGET_MAX_ROUTE_COORDINATES = 8000;
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

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
};

const coordinatesMatch = (a: MapCoordinate, b: MapCoordinate) =>
  Math.abs(a.latitude - b.latitude) < 0.00001 &&
  Math.abs(a.longitude - b.longitude) < 0.00001;

const pointToSegmentDistanceMeters = (
  point: MapCoordinate,
  start: MapCoordinate,
  end: MapCoordinate,
) => {
  const earthRadiusM = 6_371_000;
  const referenceLatRad = (point.latitude * Math.PI) / 180;
  const cosLat = Math.cos(referenceLatRad);

  const toXY = (coordinate: MapCoordinate) => ({
    x:
      earthRadiusM *
      ((coordinate.longitude - point.longitude) * Math.PI / 180) *
      cosLat,
    y:
      earthRadiusM *
      ((coordinate.latitude - point.latitude) * Math.PI / 180),
  });

  const a = toXY(start);
  const b = toXY(end);

  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const abLengthSq = abX * abX + abY * abY;

  let t = 0;

  if (abLengthSq > 0) {
    t = Math.max(
      0,
      Math.min(
        1,
        -(a.x * abX + a.y * abY) / abLengthSq,
      ),
    );
  }

  const closestX = a.x + t * abX;
  const closestY = a.y + t * abY;

  return Math.hypot(closestX, closestY);
};

// Douglas–Peucker iterativo: preserva curvas, entroncamentos e mudanças
// reais de direcção. Diferente de "pegar 1 ponto a cada N", que criava
// diagonais sobre casas em rotas muito longas.
const simplifyRouteCoordinates = (
  coordinates: MapCoordinate[],
  toleranceMeters: number,
) => {
  if (coordinates.length <= 2) return coordinates;

  const keep = new Uint8Array(coordinates.length);
  keep[0] = 1;
  keep[coordinates.length - 1] = 1;

  const stack: Array<[number, number]> = [
    [0, coordinates.length - 1],
  ];

  while (stack.length > 0) {
    const [startIndex, endIndex] = stack.pop()!;

    if (endIndex - startIndex <= 1) continue;

    let farthestIndex = -1;
    let farthestDistance = -1;

    for (
      let index = startIndex + 1;
      index < endIndex;
      index += 1
    ) {
      const distance = pointToSegmentDistanceMeters(
        coordinates[index],
        coordinates[startIndex],
        coordinates[endIndex],
      );

      if (distance > farthestDistance) {
        farthestDistance = distance;
        farthestIndex = index;
      }
    }

    if (
      farthestIndex > startIndex &&
      farthestIndex < endIndex &&
      farthestDistance > toleranceMeters
    ) {
      keep[farthestIndex] = 1;
      stack.push([startIndex, farthestIndex]);
      stack.push([farthestIndex, endIndex]);
    }
  }

  return coordinates.filter((_, index) => keep[index] === 1);
};

const preserveRoadGeometry = (coordinates: MapCoordinate[]) => {
  if (coordinates.length <= TARGET_MAX_ROUTE_COORDINATES) {
    return coordinates;
  }

  // Começa extremamente preciso para ruas urbanas. Só aumenta a tolerância
  // se a rota for realmente gigantesca.
  const tolerancesMeters = [2, 3, 5, 8, 12, 18, 25, 35];

  let simplified = coordinates;

  for (const tolerance of tolerancesMeters) {
    simplified = simplifyRouteCoordinates(coordinates, tolerance);

    if (simplified.length <= TARGET_MAX_ROUTE_COORDINATES) {
      return simplified;
    }
  }

  // Mesmo se ainda exceder o alvo, preferimos preservar a forma da estrada
  // a cortar curvas com uma amostragem uniforme.
  return simplified;
};

const getDetailedRouteCoordinates = (
  leg: any,
  fallbackPolyline: string,
): MapCoordinate[] => {
  const stepCoordinates: MapCoordinate[] = Array.isArray(leg.steps)
    ? leg.steps.flatMap((step: any) => {
        const points = step.polyline?.points;

        return typeof points === 'string'
          ? decodePolyline(points)
          : [];
      })
    : [];

  const rawCoordinates =
    stepCoordinates.length > 1
      ? stepCoordinates
      : decodePolyline(fallbackPolyline);

  const deduped = rawCoordinates.filter(
    (
      coordinate: MapCoordinate,
      index: number,
      coordinates: MapCoordinate[],
    ) => {
      if (index === 0) return true;

      return !coordinatesMatch(
        coordinate,
        coordinates[index - 1],
      );
    },
  );

  return preserveRoadGeometry(deduped);
};

const stripHtml = (value: string) =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const mapRouteSteps = (leg: any): GoogleRouteStep[] =>
  Array.isArray(leg.steps)
    ? leg.steps
        .map((step: any) => {
          const start = step.start_location;
          const end = step.end_location;

          if (!start || !end) return null;

          return {
            instruction: stripHtml(
              step.html_instructions ?? 'Siga em frente',
            ),
            distanceText: step.distance?.text ?? '',
            durationText: step.duration?.text ?? '',
            maneuver: step.maneuver,
            startLocation: {
              latitude: start.lat,
              longitude: start.lng,
            },
            endLocation: {
              latitude: end.lat,
              longitude: end.lng,
            },
          };
        })
        .filter(
          (
            step: GoogleRouteStep | null,
          ): step is GoogleRouteStep => step !== null,
        )
    : [];

const getComponentByTypes = (
  components: GoogleAddressComponent[],
  types: string[],
) =>
  components.find((component) =>
    component.types?.some((type) => types.includes(type)),
  )?.long_name;

const buildMozambiquePlaceName = (
  result: any,
  fallback: string,
) => {
  const components: GoogleAddressComponent[] =
    Array.isArray(result.address_components)
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
  const district = getComponentByTypes(components, [
    'administrative_area_level_2',
  ]);
  const province = getComponentByTypes(components, [
    'administrative_area_level_1',
  ]);

  const parts = [
    neighborhood || locality || fallback,
    district,
    province,
  ]
    .filter(Boolean)
    .filter(
      (part, index, allParts) =>
        allParts.indexOf(part) === index,
    );

  return parts.length > 0
    ? parts.join(', ')
    : result.formatted_address?.split(',')[0] || fallback;
};

const getMozambiquePlaceDetails = (result: any) => {
  const components: GoogleAddressComponent[] =
    Array.isArray(result.address_components)
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
    city: getComponentByTypes(components, [
      'locality',
      'administrative_area_level_3',
    ]),
    district: getComponentByTypes(components, [
      'administrative_area_level_2',
    ]),
    province: getComponentByTypes(components, [
      'administrative_area_level_1',
    ]),
  };
};

const isFuelStationQuery = (query: string) => {
  const normalizedQuery = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return [
    'bomba',
    'bombas',
    'combustivel',
    'gasolina',
    'diesel',
    'posto',
    'fuel',
    'gas station',
  ].some((term) => normalizedQuery.includes(term));
};

const mapPlaceResult = (
  result: any,
  fallbackName: string,
): MozambiquePlaceSuggestion | null => {
  const location = result.geometry?.location;

  if (!location) return null;

  const isFuelStation =
    result.types?.includes('gas_station');

  return {
    id: result.place_id,
    name: buildMozambiquePlaceName(
      result,
      result.name || fallbackName,
    ),
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
    origin: RouteEndpoint,
    destination: RouteEndpoint,
    waypoints: MapCoordinate[] = [],
  ): Promise<GoogleRouteSuggestion[]> {
    const apiKey = getGoogleMapsApiKey();

    if (!apiKey) return [];

    const formatEndpoint = (endpoint: RouteEndpoint) =>
      typeof endpoint === 'string'
        ? endpoint
        : `${endpoint.latitude},${endpoint.longitude}`;

    const params = new URLSearchParams({
      origin: formatEndpoint(origin),
      destination: formatEndpoint(destination),
      mode: 'driving',
      alternatives: 'true',
      language: 'pt',
      region: 'mz',
      key: apiKey,
    });

    if (waypoints.length > 0) {
      params.set(
        'waypoints',
        waypoints
          .slice(0, 23)
          .map(
            (coordinate) =>
              `${coordinate.latitude},${coordinate.longitude}`,
          )
          .join('|'),
      );

      params.set('alternatives', 'false');
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(
        `Google Directions failed with status ${response.status}`,
      );
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      if (data.status === 'ZERO_RESULTS') {
        return [];
      }

      throw new Error(
        data.error_message ||
          `Google Directions returned ${data.status}`,
      );
    }

    if (!Array.isArray(data.routes)) {
      throw new Error(
        data.error_message ||
          `Google Directions returned ${data.status}`,
      );
    }

    return data.routes
      .map((route: any) => {
        const leg = route.legs?.[0];
        const encodedPolyline =
          route.overview_polyline?.points;

        if (!leg || !encodedPolyline) {
          return null;
        }

        return {
          coordinates: getDetailedRouteCoordinates(
            leg,
            encodedPolyline,
          ),
          steps: mapRouteSteps(leg),
          distanceText: leg.distance?.text ?? '',
          durationText: leg.duration?.text ?? '',
          summary: route.summary ?? 'Google Maps',
        };
      })
      .filter(
        (
          route: GoogleRouteSuggestion | null,
        ): route is GoogleRouteSuggestion => route !== null,
      );
  },

  async searchMozambiquePlaces(
    query: string,
  ): Promise<MozambiquePlacePrediction[]> {
    const apiKey = getGoogleMapsApiKey();
    const trimmedQuery = query.trim();

    if (!apiKey || trimmedQuery.length < 2) {
      return [];
    }

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
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${autocompleteParams.toString()}`,
    );

    if (!response.ok) {
      throw new Error(
        `Google Places Autocomplete failed with status ${response.status}`,
      );
    }

    const data = await response.json();

    if (
      data.status !== 'OK' &&
      data.status !== 'ZERO_RESULTS'
    ) {
      throw new Error(
        data.error_message ||
          `Google Places Autocomplete returned ${data.status}`,
      );
    }

    return (data.predictions ?? [])
      .slice(0, MAX_SEARCH_RESULTS)
      .map((prediction: any) => ({
        id: prediction.place_id,
        name:
          prediction.structured_formatting?.main_text ||
          prediction.description,
        address:
          prediction.structured_formatting?.secondary_text ||
          prediction.description,
        category: prediction.types?.includes('gas_station')
          ? ('fuel_station' as const)
          : ('place' as const),
      }));
  },

  async getPlaceDetails(
    placeId: string,
  ): Promise<MozambiquePlaceSuggestion | null> {
    const apiKey = getGoogleMapsApiKey();

    if (!apiKey || !placeId) return null;

    const params = new URLSearchParams({
      place_id: placeId,
      fields:
        'place_id,name,formatted_address,geometry,address_components,types',
      language: 'pt',
      key: apiKey,
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(
        `Google Place Details failed with status ${response.status}`,
      );
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.result) {
      if (data.status === 'NOT_FOUND') return null;

      throw new Error(
        data.error_message ||
          `Google Place Details returned ${data.status}`,
      );
    }

    return mapPlaceResult(
      data.result,
      data.result.name || placeId,
    );
  },

  async reverseGeocodeMozambiqueCoordinate(
    coordinate: MapCoordinate,
  ): Promise<MozambiquePlaceSuggestion | null> {
    const apiKey = getGoogleMapsApiKey();

    if (!apiKey) return null;

    const params = new URLSearchParams({
      latlng: `${coordinate.latitude},${coordinate.longitude}`,
      result_type:
        'street_address|route|neighborhood|sublocality|locality|administrative_area_level_3|administrative_area_level_2|administrative_area_level_1',
      location_type:
        'ROOFTOP|RANGE_INTERPOLATED|GEOMETRIC_CENTER|APPROXIMATE',
      language: 'pt',
      key: apiKey,
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(
        `Google Reverse Geocoding failed with status ${response.status}`,
      );
    }

    const data = await response.json();

    if (
      data.status !== 'OK' ||
      !Array.isArray(data.results) ||
      data.results.length === 0
    ) {
      if (data.status === 'ZERO_RESULTS') return null;

      throw new Error(
        data.error_message ||
          `Google Reverse Geocoding returned ${data.status}`,
      );
    }

    const mozambiqueResult =
      data.results.find((result: any) =>
        result.address_components?.some(
          (component: GoogleAddressComponent) =>
            component.types?.includes('country') &&
            component.short_name === 'MZ',
        ),
      ) ?? data.results[0];

    return {
      id: mozambiqueResult.place_id,
      name: buildMozambiquePlaceName(
        mozambiqueResult,
        `${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}`,
      ),
      address: mozambiqueResult.formatted_address,
      coordinate,
      ...getMozambiquePlaceDetails(mozambiqueResult),
    };
  },

  async getNearbyDestinationPlaces(
    coordinate: MapCoordinate,
  ): Promise<NearbyPlaceLabel[]> {
    const apiKey = getGoogleMapsApiKey();

    if (!apiKey) return [];

    const params = new URLSearchParams({
      location: `${coordinate.latitude},${coordinate.longitude}`,
      radius: '1800',
      type: 'establishment',
      language: 'pt',
      key: apiKey,
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`,
    );

    if (!response.ok) return [];

    const data = await response.json();

    if (data.status !== 'OK') return [];

    const usefulTypes = [
      'hospital',
      'store',
      'supermarket',
      'pharmacy',
      'bank',
      'gas_station',
      'restaurant',
      'lodging',
    ];

    return (data.results ?? [])
      .filter(
        (place: any) =>
          place.geometry?.location &&
          place.types?.some((type: string) =>
            usefulTypes.includes(type),
          ),
      )
      .slice(0, 8)
      .map((place: any) => ({
        id: place.place_id,
        name: place.name,
        coordinate: {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
        },
        category: place.types?.[0] ?? 'local',
      }));
  },
};
