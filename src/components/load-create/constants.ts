export type LoadFillOption = {
  id: string;
  label: string;
};

export const LOAD_FILL_OPTIONS: LoadFillOption[] = [
  { id: 'completa', label: 'Carga completa' },
  { id: 'parcial', label: 'Meia carga' },
];

export const WEIGHT_UNITS = ['Toneladas', 'Quilogramas'] as const;
export const WEIGHT_UNIT_MAP: Record<string, string> = {
  'Toneladas': 'ton',
  'Quilogramas': 'kg',
};

export const MAX_PHOTOS = 5;
export const MAX_TEXT_LENGTH = 200;
