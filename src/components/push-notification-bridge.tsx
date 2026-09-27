import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/context/AuthContext';
import { notificationService } from '@/services/notifications';
import { registerForPushNotifications } from '@/services/push-notifications';

type PushData = Record<string, unknown>;

function positiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function openDriverNotification(data: PushData) {
  const tripId = positiveNumber(data.trip_id);
  if (tripId) {
    router.push({ pathname: '/trip_details', params: { id: String(tripId), from: 'notification' } });
    return;
  }
  router.push('/notifications');
}

export function PushNotificationBridge() {
  const { user, isLoading, isPending } = useAuth();
  const handledResponse = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading || !user || isPending) return;
    void registerForPushNotifications('driver').catch((error) => {
      console.warn('Não foi possível activar notificações neste aparelho:', error?.message);
    });
  }, [isLoading, isPending, user?.id]);

  useEffect(() => {
    if (isLoading || !user || isPending) return;

    const handle = (response: Notifications.NotificationResponse) => {
      const identifier = response.notification.request.identifier;
      if (handledResponse.current === identifier) return;
      handledResponse.current = identifier;
      const data = response.notification.request.content.data as PushData;
      const notificationId = positiveNumber(data.notification_id);
      if (notificationId) void notificationService.markAsRead(notificationId).catch(() => undefined);
      openDriverNotification(data);
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(handle);
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handle(response);
    });
    return () => subscription.remove();
  }, [isLoading, isPending, user?.id]);

  return null;
}
