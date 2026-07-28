import api from './api';

export interface Driver {
  id: number;
  user_id: number;
  company_id: number | null;
  name: string;
  email: string | null;
  average_rating: number;
  total_trips: number;
  available: boolean;
  profile_photo: string | null;
  verified: boolean;
  current_lat: number | null;
  current_lng: number | null;
  location_updated_at: string | null;
}

export interface CreateDriverRequest {
  name: string;
  email: string;
  phone: string;
  license_number: string;
  license_expiry?: string;
  years_experience?: number;
}

export interface CreateDriverResponse {
  id: number;
  user_id: number;
  name: string;
  email: string | null;
  phone: string;
  company_id: number;
  temporary_password: string;
  average_rating: number;
  total_trips: number;
  available: boolean;
}

export const driverService = {
  async getMyDrivers(): Promise<Driver[]> {
    const response = await api.get('/companies/me/drivers');
    return response.data;
  },

  async createDriver(data: CreateDriverRequest): Promise<CreateDriverResponse> {
    const response = await api.post('/companies/me/drivers/create', data);
    return response.data;
  },

  async associateDriver(email: string): Promise<Driver> {
    const response = await api.post('/companies/me/drivers', { email });
    return response.data;
  },

  async removeDriver(driverId: number): Promise<void> {
    await api.delete(`/companies/me/drivers/${driverId}`);
  },

  async getDriverById(driverId: number): Promise<Driver> {
    const response = await api.get(`/drivers/${driverId}`);
    return response.data;
  },
};
