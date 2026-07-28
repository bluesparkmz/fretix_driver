import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FretixColors } from '@/constants/theme';
import { useAppDrawer } from '@/components/app-drawer';
import { useAppData } from '@/context/AppDataContext';

type TopAppHeaderProps = {
  notificationCount?: number;
};

function HeaderTitle() {
  return (
    <Text style={styles.logoText} numberOfLines={1}>
      Fret<Text style={styles.logoAccent}>ix</Text>
    </Text>
  );
}

export function TopAppHeader({ notificationCount }: TopAppHeaderProps) {
  const { openDrawer } = useAppDrawer();
  const { notificationUnreadCount, loadNotificationUnreadCountIfNeeded } = useAppData();

  const unreadCount = notificationUnreadCount.isLoaded
    ? notificationUnreadCount.data
    : (notificationCount ?? 0);

  useEffect(() => {
    void loadNotificationUnreadCountIfNeeded();
  }, [loadNotificationUnreadCountIfNeeded]);

  return (
    <View style={styles.headerTop}>
      <Pressable
        style={styles.sideSlot}
        accessibilityRole="button"
        accessibilityLabel="Menu"
        onPress={openDrawer}
      >
        <Ionicons name="menu" size={22} color={FretixColors.white} />
      </Pressable>

      <View style={styles.titleSlot}>
        <HeaderTitle />
      </View>

      <Pressable
        style={styles.sideSlot}
        accessibilityRole="button"
        accessibilityLabel="Notificacoes"
        onPress={() => router.push('/notifications')}
      >
        <View style={styles.bellWrap}>
          <Ionicons name="notifications-outline" size={22} color={FretixColors.white} />
          {unreadCount > 0 && (
            <View style={styles.badgeDot}>
              <Text style={styles.badgeDotText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideSlot: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  logoText: {
    color: FretixColors.white,
    fontSize: 26,
    fontWeight: '700',
  },
  logoAccent: {
    color: FretixColors.yellow,
  },
  bellWrap: {
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: -5,
    right: -6,
    backgroundColor: FretixColors.yellow,
    borderRadius: 999,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeDotText: {
    color: '#101217',
    fontSize: 9,
    fontWeight: '700',
  },
});
