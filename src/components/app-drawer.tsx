import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDecay,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FretixColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { UserAvatar } from '@/components/user-avatar';
import { getUserRoleLabel } from '@/utils/user-role';

type DrawerContextValue = {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

type DrawerItem = {
  label: string;
  caption: string;
  icon: keyof typeof Ionicons.glyphMap;
  href?: Parameters<typeof router.push>[0];
  danger?: boolean;
  action?: () => void;
};

const DrawerContext = createContext<DrawerContextValue | undefined>(undefined);

export function useAppDrawer() {
  const context = useContext(DrawerContext);
  if (!context) {
    return {
      isOpen: false,
      openDrawer: () => { },
      closeDrawer: () => { },
      toggleDrawer: () => { },
    };
  }
  return context;
}

export function AppDrawer({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const progress = useSharedValue(0);
  const translateX = useSharedValue(0);
  const drawerWidth = Math.min(width * 0.7, 310);

  useEffect(() => {
    if (isOpen) {
      progress.value = withTiming(1, { duration: 260 });
      translateX.value = withTiming(drawerWidth, { duration: 260 });
    } else {
      progress.value = withTiming(0, { duration: 260 });
      translateX.value = withTiming(0, { duration: 260 });
    }
  }, [isOpen, progress, translateX, drawerWidth]);

  const closeDrawer = useCallback(() => setIsOpen(false), []);
  const openDrawer = useCallback(() => setIsOpen(true), []);
  const toggleDrawer = useCallback(() => setIsOpen((current) => !current), []);

  const startX = useSharedValue(0);
  const shouldHandleGesture = useSharedValue(false);

  const gesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-15, 15])
    .onStart((event) => {
      startX.value = event.x;
      // Only allow opening from the left edge (first 50px)
      shouldHandleGesture.value = isOpen || (startX.value < 50);
    })
    .onUpdate((event) => {
      if (!shouldHandleGesture.value) return;

      if (!isOpen && event.translationX > 0) {
        // Open gesture
        const newX = Math.min(Math.max(0, event.translationX), drawerWidth);
        translateX.value = newX;
        progress.value = newX / drawerWidth;
      } else if (isOpen && event.translationX < 0) {
        // Close gesture
        const newX = Math.min(Math.max(0, drawerWidth + event.translationX), drawerWidth);
        translateX.value = newX;
        progress.value = newX / drawerWidth;
      }
    })
    .onEnd((event) => {
      if (!shouldHandleGesture.value) return;

      if (!isOpen) {
        // Opening
        if (translateX.value > drawerWidth * 0.3 || event.velocityX > 500) {
          runOnJS(setIsOpen)(true);
        } else {
          runOnJS(setIsOpen)(false);
        }
      } else {
        // Closing
        if (translateX.value < drawerWidth * 0.7 || event.velocityX < -500) {
          runOnJS(setIsOpen)(false);
        } else {
          runOnJS(setIsOpen)(true);
        }
      }
    });

  const navigate = useCallback(
    (href: DrawerItem['href']) => {
      if (!href) return;
      closeDrawer();
      requestAnimationFrame(() => router.push(href));
    },
    [closeDrawer]
  );

  const items = useMemo<DrawerItem[]>(() => {
    const base: DrawerItem[] = [
      { label: 'Inicio', caption: 'Resumo do motorista', icon: 'home-outline', href: '/' },
      { label: 'Viagens', caption: 'Viagens do seu camião', icon: 'navigate-outline', href: '/trips' },
      { label: 'Perfil', caption: 'Dados da conta', icon: 'person-outline', href: '/profile' },
      { label: 'Notificações', caption: 'Alertas recentes', icon: 'notifications-outline', href: '/notifications' },
    ];

    return [
      ...base,
      {
        label: 'Sair',
        caption: 'Terminar sessao',
        icon: 'log-out-outline',
        danger: true,
        action: async () => {
          closeDrawer();
          await logout();
        },
      },
    ];
  }, [closeDrawer, logout]);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { translateX: translateX.value },
      { scale: interpolate(progress.value, [0, 1], [1, 0.88]) },
      { rotateY: `${interpolate(progress.value, [0, 1], [0, -7])}deg` },
    ],
    borderRadius: interpolate(progress.value, [0, 1], [0, 28]),
  }));

  const menuStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.55, 1]),
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [-24, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.96, 1]) },
    ],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.28]),
  }));

  const userName = user?.name || 'Utilizador';
  const role = getUserRoleLabel(user);

  return (
    <DrawerContext.Provider value={{ isOpen, openDrawer, closeDrawer, toggleDrawer }}>
      <View style={styles.root}>
        <Animated.View style={[styles.menuLayer, { width: drawerWidth }, menuStyle]}>
          <SafeAreaView style={styles.menuSafe} edges={['top', 'bottom']}>
            <View style={styles.menuHeader}>
              <UserAvatar photo={user?.profile_photo} style={styles.avatar} />
              <View style={styles.userCopy}>
                <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
                <Text style={styles.userRole}>{role}</Text>
              </View>
            </View>



            <View style={styles.menuItems}>
              {items.map((item) => (
                <Pressable
                  key={item.label}
                  style={styles.menuItem}
                  onPress={() => (item.action ? item.action() : navigate(item.href))}
                  accessibilityRole="button"
                >
                  <View style={[styles.menuIcon, item.danger && styles.menuIconDanger]}>
                    <Ionicons
                      name={item.icon}
                      size={19}
                      color={item.danger ? '#FCA5A5' : FretixColors.yellow}
                    />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>
                      {item.label}
                    </Text>
                    <Text style={styles.menuCaption}>{item.caption}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </SafeAreaView>
        </Animated.View>

        <Animated.View pointerEvents="none" style={[styles.dimOverlay, overlayStyle]} />

        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.contentLayer, contentStyle]}>
            {children}
            {isOpen && (
              <Pressable
                style={styles.closeHitArea}
                onPress={closeDrawer}
                accessibilityRole="button"
                accessibilityLabel="Fechar menu"
              />
            )}
          </Animated.View>
        </GestureDetector>
      </View>
    </DrawerContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#071018',
    overflow: 'hidden',
  },
  menuLayer: {
    ...StyleSheet.absoluteFill,
    right: undefined,
    zIndex: 1,
  },
  menuSafe: {
    flex: 1,
    paddingLeft: 18,
    paddingRight: 12,
    paddingVertical: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: FretixColors.yellow,
  },
  userCopy: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    color: FretixColors.white,
    fontSize: 17,
    fontWeight: '800',
  },
  userRole: {
    color: FretixColors.yellow,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  walletMini: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  walletLabel: {
    color: FretixColors.grayLight,
    fontSize: 12,
  },
  walletValue: {
    color: FretixColors.white,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 3,
  },
  menuItems: {
    gap: 6,
  },
  menuItem: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 8,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,193,7,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconDanger: {
    backgroundColor: 'rgba(239,68,68,0.14)',
  },
  menuText: {
    flex: 1,
    minWidth: 0,
  },
  menuLabel: {
    color: FretixColors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  menuLabelDanger: {
    color: '#FCA5A5',
  },
  menuCaption: {
    color: FretixColors.grayLight,
    fontSize: 11,
    marginTop: 2,
  },
  dimOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 2,
  },
  contentLayer: {
    flex: 1,
    zIndex: 3,
    backgroundColor: FretixColors.black,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: -8, height: 12 },
    shadowOpacity: 0.34,
    shadowRadius: 24,
    elevation: 18,
  },
  closeHitArea: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
});
