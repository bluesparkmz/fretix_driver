import '../../global.css';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { SplashScreen } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { FretixColors } from '@/constants/theme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppDrawer } from '@/components/app-drawer';
import AppTabs from '@/components/app-tabs';
import { AppDataProvider } from '@/context/AppDataContext';
import { AuthProvider } from '@/context/AuthContext';
import { WebSocketProvider } from '@/context/WebSocketContext';
import { WebSocketDataBridge } from '@/components/websocket-data-bridge';
import LoginScreen from './login';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={FretixColors.yellow} />
      </View>
    );
  }

  if (!user) {
    return (
      <ThemeProvider value={DarkTheme}>
        <LoginScreen />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <AppDrawer>
        <AppTabs />
      </AppDrawer>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: FretixColors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppDataProvider>
          <WebSocketProvider>
            <WebSocketDataBridge />
            <RootLayoutNav />
          </WebSocketProvider>
        </AppDataProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
