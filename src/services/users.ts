import api from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'client' | 'driver';
}

export const userService = {
  async getCurrentUser(): Promise<User> {
    try {
      let response;
      try {
        response = await api.get('/users/me');
      } catch (e) {
        response = await api.get('/api/users/me');
      }
      return response.data;
    } catch (error: any) {
      console.error('Failed to get current user:', error.response?.data || error.message);
      throw error;
    }
  },
};
