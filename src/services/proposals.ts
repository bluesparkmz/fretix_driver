import api from './api';

export type ProposalStatus = 'pendente' | 'em_negociacao' | 'aceite' | 'recusada';

export interface ProposalLoadSummary {
  id: number;
  code: string;
  load_type: string;
  load_name: string;
  origin: string;
  destination: string;
  value: number | null;
  negotiable: boolean;
  status: string;
  departure_date: string;
}

export interface ProposalCompanySummary {
  id: number;
  company_name: string;
  average_rating: number;
  total_trips: number;
  verified: boolean;
  logo_url?: string | null;
}

export interface ProposalDriverSummary {
  id: number;
  name: string;
  average_rating: number;
  total_trips: number;
  available: boolean;
  avatar_url?: string | null;
}

export interface ProposalVehicleSummary {
  id: number;
  plate: string;
  brand: string;
  model_name: string;
  vehicle_type: string;
  tonnage_capacity: number | null;
  status: string;
}

export interface LoadProposal {
  id: number;
  load_id: number;
  company_id: number | null;
  driver_id: number | null;
  vehicle_id: number | null;
  proposed_value: number | null;
  message: string | null;
  status: ProposalStatus;
  created_at: string;
  load: ProposalLoadSummary;
  company: ProposalCompanySummary | null;
  driver: ProposalDriverSummary | null;
  vehicle: ProposalVehicleSummary | null;
}

export interface CreateProposalRequest {
  proposed_value?: number | null;
  message?: string | null;
  driver_id?: number | null;
  vehicle_id?: number | null;
}

export interface ProposalNegotiation {
  id: number;
  proposal_id: number;
  sender_id: number;
  sender_name: string | null;
  sender_type: string | null;
  amount: number;
  message: string | null;
  status: string;
  created_at: string;
}

export interface ProposalNegotiationDetail {
  proposal: LoadProposal;
  negotiations: ProposalNegotiation[];
}

export const proposalService = {
  async createProposal(loadId: number, data: CreateProposalRequest): Promise<LoadProposal> {
    const response = await api.post(`/proposals/loads/${loadId}`, data);
    return response.data;
  },

  async getMyProposals(status?: ProposalStatus): Promise<LoadProposal[]> {
    const response = await api.get('/proposals/me', { params: status ? { status } : undefined });
    return response.data;
  },

  async getReceivedProposals(status?: ProposalStatus): Promise<LoadProposal[]> {
    const response = await api.get('/proposals/received', { params: status ? { status } : undefined });
    return response.data;
  },

  async getNegotiations(proposalId: number): Promise<ProposalNegotiationDetail> {
    const response = await api.get(`/proposals/${proposalId}/negotiations`);
    return response.data;
  },

  async createCounterOffer(
    proposalId: number,
    amount: number,
    message?: string
  ): Promise<ProposalNegotiation> {
    const response = await api.post(`/proposals/${proposalId}/negotiations`, {
      amount,
      message: message || undefined,
    });
    return response.data;
  },

  async acceptNegotiation(proposalId: number, negotiationId: number): Promise<LoadProposal> {
    const response = await api.post(
      `/proposals/${proposalId}/negotiations/${negotiationId}/accept`
    );
    return response.data;
  },

  async rejectNegotiation(proposalId: number, negotiationId: number): Promise<LoadProposal> {
    const response = await api.post(
      `/proposals/${proposalId}/negotiations/${negotiationId}/reject`
    );
    return response.data;
  },

  async acceptProposal(id: number): Promise<LoadProposal> {
    const response = await api.post(`/proposals/${id}/accept`);
    return response.data;
  },

  async rejectProposal(id: number): Promise<LoadProposal> {
    const response = await api.post(`/proposals/${id}/reject`);
    return response.data;
  },
};
