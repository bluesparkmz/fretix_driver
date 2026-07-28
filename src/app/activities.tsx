import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FretixColors } from '@/constants/theme';
import { Activity, activityService, mapActivities } from '@/services/activities';

function withAlpha(hexColor: string | undefined, alpha: number) {
  if (!hexColor) return `rgba(0, 0, 0, ${alpha})`;
  const hex = hexColor.replace('#', '');
  const normalized = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const int = Number.parseInt(normalized, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function ActivitiesScreen() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivities = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await activityService.getMyActivities(100);
      const mapped = mapActivities(data);
      setActivities(mapped);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={FretixColors.white} />
          </Pressable>
          <Text style={styles.title}>Atividades</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchActivities(true)}
              colors={[FretixColors.yellow]}
              tintColor={FretixColors.yellow}
            />
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={FretixColors.yellow} size="large" />
            </View>
          ) : activities.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={64} color={FretixColors.grayLight} />
              <Text style={styles.emptyTitle}>Nenhuma atividade</Text>
              <Text style={styles.emptyText}>Você ainda não tem atividades registradas.</Text>
            </View>
          ) : (
            activities.map((item) => (
              <View key={item.id} style={styles.activityCard}>
                <View style={[styles.activityIcon, { backgroundColor: withAlpha(item.iconColor, 0.16) }]}>
                  <Ionicons name="cube" size={20} color={item.iconColor} />
                </View>
                <View style={styles.activityMain}>
                  <Text style={styles.activityId}>{item.id}</Text>
                  <Text style={styles.activityRoute}>{item.route}</Text>
                  <Text style={styles.activityCargo}>{item.cargo}</Text>
                </View>
                <View style={styles.activityMeta}>
                  <View style={[styles.statusPill, { backgroundColor: item.statusColor }]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                  <Text style={styles.activityTime}>{item.time}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FretixColors.black,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: FretixColors.white,
    fontSize: 20,
    fontWeight: '800',
  },
  placeholder: {
    width: 40,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 10,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    color: FretixColors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    color: FretixColors.grayLight,
    fontSize: 14,
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: '#111824',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#273241',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityMain: {
    flex: 1,
    gap: 2,
  },
  activityId: {
    color: FretixColors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  activityRoute: {
    color: FretixColors.grayLight,
    fontSize: 13,
  },
  activityCargo: {
    color: FretixColors.grayLight,
    fontSize: 12,
  },
  activityMeta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    color: FretixColors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  activityTime: {
    color: FretixColors.grayLight,
    fontSize: 12,
  },
});
