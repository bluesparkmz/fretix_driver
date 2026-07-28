import type { User } from '@/services/auth';
import { userNeedsOnboarding } from '@/services/auth';

export function getUserRoleLabel(user: User | null | undefined): string {
  if (!user) return '';
  if (userNeedsOnboarding(user)) return 'Pendente';
  if (user.user_type === 'empresa') return 'Empresa';
  if (user.user_type === 'cliente') return 'Cliente';
  if (user.user_type === 'motorista') return 'Motorista';
  return 'Utilizador';
}
