import api from '@/services/api';
import type { LoadType } from '@/services/loads';

const LOAD_TYPE_ALIASES: Record<string, string> = {
  mercadoria: 'mercadoria_geral',
  'mercadoria-geral': 'mercadoria_geral',
};

export function normalizeLoadTypeId(loadType: string): string {
  const key = loadType.trim();
  return LOAD_TYPE_ALIASES[key] ?? key;
}

export function resolveLoadTypeImageUrl(
  loadType: string,
  types: LoadType[]
): string | null {
  const id = normalizeLoadTypeId(loadType);
  const match = types.find((item) => item.id === id);
  if (!match?.image) {
    return null;
  }
  return `${api.defaults.baseURL}${match.image}`;
}

export function resolveLoadTypeLabel(
  loadType: string,
  types: LoadType[]
): string | null {
  const id = normalizeLoadTypeId(loadType);
  const match = types.find((item) => item.id === id);
  return match?.label ?? null;
}
