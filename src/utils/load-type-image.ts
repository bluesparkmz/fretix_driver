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
  const id = normalizeLoadTypeId(loadType).toLowerCase();
  const match = types.find((item) => item.id.toLowerCase() === id);
  if (!match?.image) {
    return null;
  }

  const image = match.image.trim();
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }

  const base = api.defaults.baseURL?.replace(/\/$/, '');
  if (!base) {
    return null;
  }
  return `${base}${image.startsWith('/') ? image : `/${image}`}`;
}

export function resolveLoadTypeLabel(
  loadType: string,
  types: LoadType[]
): string | null {
  const id = normalizeLoadTypeId(loadType);
  const match = types.find((item) => item.id === id);
  return match?.label ?? null;
}
