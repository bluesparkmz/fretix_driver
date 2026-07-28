import api from './api';

export interface Load {
  id: number;
  code: string;
  load_type: string;
  load_name: string;
  origin: string;
  destination: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  weight: number;
  weight_unit: string;
  value: number;
  negotiable: boolean;
  status: string;
  departure_date: string;
  created_at: string;
}

export interface LoadSender {
  client_id: number;
  user_id: number;
  name: string;
  phone: string;
  email?: string | null;
  profile_photo?: string | null;
  verified: boolean;
  average_rating?: number | null;
  rating_count: number;
}

export interface LoadDetail extends Load {
  description?: string | null;
  volume?: number | null;
  load_fill?: string | null;
  suggested_vehicle_type?: string | null;
  instructions?: string | null;
  load_type_label?: string | null;
  load_fill_label?: string | null;
  images?: any[];
  sender?: LoadSender;
  route?: any;
  proposals_count?: number;
}

export interface LoadType {
  id: string;
  label: string;
  icon?: string;
  image?: string;
}

export interface LoadFillType {
  id: string;
  label: string;
}

export interface DashboardStats {
  available_loads: number;
  active_loads: number;
  completed_this_month: number;
  available_vehicles: number;
}

export const loadService = {
  async getMyLoads(): Promise<Load[]> {
    const response = await api.get('/loads/me');
    return response.data;
  },

  async getAvailableLoads(): Promise<Load[]> {
    const response = await api.get('/loads?status=disponivel');
    return response.data;
  },

  async getLoads(): Promise<Load[]> {
    const response = await api.get('/loads');
    return response.data;
  },

  async getLoadTypes(): Promise<LoadType[]> {
    const response = await api.get('/loads/types');
    return response.data;
  },

  async getLoadFillTypes(): Promise<LoadFillType[]> {
    const response = await api.get('/loads/fill-types');
    return response.data;
  },

  async createLoad(formData: FormData): Promise<Load> {
    const response = await api.post('/loads', formData);
    return response.data;
  },

  async updateLoad(id: number, patch: Partial<LoadDetail>): Promise<LoadDetail> {
    const response = await api.patch(`/loads/${id}`, patch);
    return response.data;
  },

  async deleteLoad(id: number): Promise<void> {
    await api.delete(`/loads/${id}`);
  },

  async getLoadById(id: number): Promise<LoadDetail> {
    const response = await api.get(`/loads/${id}`);
    return response.data;
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await api.get('/stats/dashboard');
    return response.data;
  },
};
