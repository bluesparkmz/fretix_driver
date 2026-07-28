import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

export const API_BASE_URL = 'https://cargolink.bluesparkmz.com';

const api = axios.create({
  baseURL: API_BASE_URL,
});

let isSigningOut = false;

api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !isSigningOut) {
      isSigningOut = true;
      try {
        await SecureStore.deleteItemAsync('authToken');
        await SecureStore.deleteItemAsync('user');
      } finally {
        isSigningOut = false;
      }

      try {
        const currentPath = router.canGoBack() ? undefined : '/login';
        if (currentPath) {
          router.replace(currentPath);
        }
      } catch {
        // Ignore router errors during initialization
      }
    }
    return Promise.reject(error);
  }
);

export default api;
