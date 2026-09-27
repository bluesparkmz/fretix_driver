import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import api from './api';

export const PUSH_TOKEN_STORAGE_KEY = 'fretixExpoPushToken';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(appName: 'main' | 'driver') {
  if (!Device.isDevice || Platform.OS === 'web') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('fretix-default', {
      name: 'Notificações Fretix',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFC107',
    });
  }

  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (permission.status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('EAS projectId não configurado');

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await api.post('/users/me/push-tokens', {
    token,
    app_name: appName,
    platform: Platform.OS,
  });
  return token;
}
