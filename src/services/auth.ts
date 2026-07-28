import api from './api';
import * as SecureStore from 'expo-secure-store';

export interface User {
  id: string | number;
  name: string;
  email: string;
  phone: string;
  user_type: 'usuario' | 'cliente' | 'motorista' | 'empresa';
  status: string;
  verified: boolean;
  profile_photo: string | null;
  needs_onboarding?: boolean;
}

export function userNeedsOnboarding(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.needs_onboarding === true;
}

export type OnboardingChoice = 'carga' | 'camioes';

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface AuthResult {
  access_token: string;
  token_type: string;
  user: User;
}

export const authService = {
  async getMe(): Promise<User> {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async login(email: string, password: string): Promise<AuthResult> {
    const response = await api.post('/auth/login', { email, password });
    const { access_token } = response.data;
    await SecureStore.setItemAsync('authToken', access_token);

    // Get real user data from /auth/me
    const user = await authService.getMe();
    await SecureStore.setItemAsync('user', JSON.stringify(user));

    return {
      ...response.data,
      user,
    };
  },

  async loginWithGoogle(idToken: string): Promise<AuthResult> {
    const response = await api.post('/auth/google', { id_token: idToken });
    const { access_token } = response.data;
    await SecureStore.setItemAsync('authToken', access_token);

    const user = await authService.getMe();
    await SecureStore.setItemAsync('user', JSON.stringify(user));

    return {
      ...response.data,
      user,
    };
  },

  async register(
    name: string,
    email: string,
    phone: string,
    password: string
  ): Promise<AuthResult> {
    const response = await api.post('/auth/register', {
      name,
      email,
      phone,
      password,
    });
    const { access_token } = response.data;
    await SecureStore.setItemAsync('authToken', access_token);

    const user = await authService.getMe();
    await SecureStore.setItemAsync('user', JSON.stringify(user));

    return {
      ...response.data,
      user,
    };
  },

  async completeOnboarding(choice: OnboardingChoice): Promise<User> {
    const response = await api.post('/auth/complete-onboarding', { choice });
    const user = response.data;
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    return user;
  },

  async logout(): Promise<void> {
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('user');
  },

  async getStoredUser(): Promise<User | null> {
    const userJson = await SecureStore.getItemAsync('user');
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch (e) {
      return null;
    }
  },

  async getStoredToken(): Promise<string | null> {
    return SecureStore.getItemAsync('authToken');
  },

  async updateUser(data: Partial<Pick<User, 'name' | 'email' | 'profile_photo'>>): Promise<User> {
    const response = await api.patch('/users/me', data);
    const user = response.data;
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    return user;
  },
};
