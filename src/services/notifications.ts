import api from './api';

export interface AppNotification {
  id: number;
  user_id: number;
  title: string;
  body: string;
  notification_type: string | null;
  payload: any | null;
  read: boolean;
  created_at: string;
}

export interface UnreadCountResponse {
  count: number;
}

export const notificationService = {
  async getNotifications(unreadOnly = false): Promise<AppNotification[]> {
    const response = await api.get('/notifications', {
      params: { unread_only: unreadOnly },
    });
    return response.data;
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get('/notifications/unread-count');
    return response.data.count;
  },

  async markAsRead(id: number): Promise<AppNotification> {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  async markAllAsRead(): Promise<{ updated: number }> {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },
};
