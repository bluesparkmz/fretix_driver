export type LoadCreateFormData = {
  cargoTypeId: string;
  cargoTypeLabel: string;
  photos: string[];
  origin: string;
  destination: string;
  departureDate: string;
  name: string;
  description: string;
  weight: string;
  weightUnit: string;
  volume: string;
  value: string;
  specialInstructions: string;
  negotiable: boolean;
  loadFill: string;
  suggestedVehicleType: string;
  originLat: string;
  originLng: string;
  destinationLat: string;
  destinationLng: string;
};

export function createDefaultLoadForm(): LoadCreateFormData {
  return {
    cargoTypeId: '',
    cargoTypeLabel: '',
    photos: [],
    origin: '',
    destination: '',
    departureDate: '',
    name: '',
    description: '',
    weight: '',
    weightUnit: 'Toneladas',
    volume: '',
    value: '',
    specialInstructions: '',
    negotiable: false,
    loadFill: '',
    suggestedVehicleType: '',
    originLat: '',
    originLng: '',
    destinationLat: '',
    destinationLng: '',
  };
}

export const INITIAL_LOAD_CREATE_FORM: LoadCreateFormData = createDefaultLoadForm();

export const LOAD_CREATE_STEPS = [
  { key: 'cargo', label: 'Carga' },
  { key: 'route', label: 'Origem e destino' },
  { key: 'details', label: 'Detalhes' },
] as const;
