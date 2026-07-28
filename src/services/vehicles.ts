import api from './api';

export interface Vehicle {
  id: number;
  company_id: number | null;
  driver_id: number | null;
  plate: string;
  brand: string | null;
  model_name: string | null;
  vehicle_type: string | null;
  tonnage_capacity: number | null;
  photo: string | null;
  status: string;
  current_lat: number | null;
  current_lng: number | null;
  location_updated_at: string | null;
  company_name?: string | null;
  driver_name?: string | null;
  driver_rating?: number | null;
  driver_photo?: string | null;
}

export type VehicleUpdatePayload = Partial<
  Pick<
    Vehicle,
    | 'driver_id'
    | 'plate'
    | 'brand'
    | 'model_name'
    | 'vehicle_type'
    | 'tonnage_capacity'
    | 'photo'
    | 'status'
    | 'current_lat'
    | 'current_lng'
  >
> & {
  driver_email?: string | null;
};

export const vehicleService = {
  async getAvailableVehicles(status = 'disponivel'): Promise<Vehicle[]> {
    const response = await api.get('/vehicles', { params: { status, available_only: true } });
    return response.data;
  },

  async getMyVehicles(): Promise<Vehicle[]> {
    const response = await api.get('/vehicles/me');
    return response.data;
  },

  async createVehicle(formData: FormData): Promise<Vehicle> {
    const response = await api.post('/vehicles', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async deleteVehicle(id: number): Promise<void> {
    await api.delete(`/vehicles/${id}`);
  },

  async getVehicleById(id: number): Promise<Vehicle> {
    const response = await api.get(`/vehicles/${id}`);
    return response.data;
  },

  async updateVehicle(id: number, data: VehicleUpdatePayload): Promise<Vehicle> {
    const response = await api.patch(`/vehicles/${id}`, data);
    return response.data;
  },

  async updateVehicleWithPhoto(id: number, formData: FormData): Promise<Vehicle> {
    /**
     * Atualiza veículo com opção de incluir nova foto.
     * FormData deve conter os campos do veículo + 'photo' (arquivo)
     */
    const response = await api.patch(`/vehicles/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
