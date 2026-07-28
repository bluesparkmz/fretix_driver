import api from './api';

export interface Wallet {
  available_balance: number;
  pending_balance: number;
  blocked_balance: number;
  currency: string;
}

export interface Transaction {
  id: number;
  transaction_type: string;
  amount: number;
  status: string;
  reference: string | null;
  description: string | null;
  created_at: string;
}

export interface WalletDepositResponse {
  payment_id: number;
  transaction_id: number;
  amount: number;
  status: string;
  external_reference: string;
  phone: string;
  message: string;
}

export interface WalletDepositStatusResponse {
  payment_id: number;
  amount: number;
  status: string;
  external_reference: string;
  phone: string;
  message: string;
}

export const walletService = {
  async getWallet(): Promise<Wallet> {
    const response = await api.get('/wallet');
    return response.data;
  },

  async getTransactions(limit: number = 50, offset: number = 0): Promise<Transaction[]> {
    const response = await api.get('/wallet/transactions', {
      params: { limit, offset },
    });
    return response.data;
  },

  async createDeposit(amount: number, phone?: string): Promise<WalletDepositResponse> {
    const response = await api.post('/wallet/deposits', {
      amount,
      phone,
      method: 'mpesa',
    });
    return response.data;
  },

  async createDepositWithPolling(amount: number, phone?: string): Promise<WalletDepositResponse> {
    /**
     * Inicia depósito e aguarda confirmação automaticamente (até 60 segundos).
     * 
     * Use quando quiser que o app espere o usuário confirmar no M-Pesa
     * antes de retornar o resultado (confirmado/rejeitado/timeout).
     * 
     * Retorna:
     * - status: "completed" → Pagamento confirmado, saldo atualizado ✅
     * - status: "failed" → Pagamento rejeitado ❌
     * - status: "pending" → Timeout, mas pode confirmar depois
     */
    const response = await api.post('/wallet/deposits-with-polling', {
      amount,
      phone,
      method: 'mpesa',
    }, {
      timeout: 90_000, // backend faz polling M-Pesa até ~60s
    });
    return response.data;
  },

  async syncDeposit(paymentId: number): Promise<WalletDepositStatusResponse> {
    const response = await api.post(`/wallet/deposits/${paymentId}/sync`);
    return response.data;
  },

  async confirmDeposit(paymentId: number): Promise<WalletDepositResponse> {
    const response = await api.post(`/wallet/deposits/${paymentId}/confirm`);
    return response.data;
  },
};
