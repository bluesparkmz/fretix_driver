import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { FretixColors } from '@/constants/theme';

type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: any;
};

export function Skeleton({ width = '100%', height = 20, borderRadius = 4, style }: SkeletonProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.6, 0.3],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Skeleton width={54} height={54} borderRadius={10} />
        <View style={styles.cardContent}>
          <Skeleton width={120} height={16} borderRadius={4} />
          <View style={{ height: 4 }} />
          <Skeleton width={180} height={14} borderRadius={4} />
          <View style={{ height: 6 }} />
          <Skeleton width={100} height={12} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

export function SkeletonProposalCard() {
  return (
    <View style={styles.proposalCard}>
      <View style={styles.proposalCardHeader}>
        <View style={{ flex: 1, gap: 4 }}>
          <Skeleton width={80} height={14} borderRadius={4} />
          <Skeleton width={140} height={16} borderRadius={4} />
        </View>
        <Skeleton width={100} height={24} borderRadius={999} />
      </View>
      <View style={styles.proposalCardBody}>
        <View style={{ gap: 2 }}>
          <Skeleton width={100} height={14} borderRadius={4} />
          <Skeleton width={120} height={20} borderRadius={4} />
        </View>
        <Skeleton width={80} height={24} borderRadius={999} />
      </View>
      <Skeleton width={100} height={12} borderRadius={4} style={{ marginTop: 8 }} />
      <View style={styles.proposalCardActions}>
        <Skeleton width="48%" height={40} borderRadius={10} />
        <Skeleton width="48%" height={40} borderRadius={10} />
      </View>
    </View>
  );
}

export function SkeletonProposalList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonProposalCard key={i} />
      ))}
    </View>
  );
}

export function SkeletonNotificationCard() {
  return (
    <View style={styles.notificationCard}>
      <View style={styles.notificationIconWrap}>
        <Skeleton width={40} height={40} borderRadius={10} />
      </View>
      <View style={styles.notificationMain}>
        <View style={styles.notificationTopRow}>
          <Skeleton width={120} height={16} borderRadius={4} />
          <Skeleton width={8} height={8} borderRadius={4} />
        </View>
        <Skeleton width={200} height={14} borderRadius={4} />
        <View style={{ height: 4 }} />
        <Skeleton width={80} height={12} borderRadius={4} />
      </View>
    </View>
  );
}

export function SkeletonNotificationList({ count = 5 }: { count?: number }) {
  return (
    <View style={{ gap: 12, paddingHorizontal: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonNotificationCard key={i} />
      ))}
    </View>
  );
}

export function SkeletonCargoDetails() {
  return (
    <View style={{ gap: 16 }}>
      {/* Summary Card Skeleton */}
      <View style={styles.cargoDetailsSummaryCard}>
        <View style={styles.cargoDetailsImageWrap}>
          <Skeleton width={80} height={80} borderRadius={16} />
        </View>
        <View style={styles.cargoDetailsSummaryMain}>
          <View style={styles.cargoDetailsCompleteBadge}>
            <Skeleton width={120} height={16} borderRadius={999} />
          </View>
          <Skeleton width={200} height={24} borderRadius={4} style={{ marginTop: 8 }} />
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <Skeleton width={100} height={20} borderRadius={4} />
            <Skeleton width={80} height={18} borderRadius={999} />
          </View>
          {/* Route Block */}
          <View style={styles.cargoDetailsRouteBlock}>
            <View style={styles.cargoDetailsRoutePoint}>
              <Skeleton width={16} height={16} borderRadius={8} />
              <Skeleton width={150} height={16} borderRadius={4} />
            </View>
            <View style={styles.cargoDetailsRouteConnector}>
              <View style={{ width: 2, height: 20, backgroundColor: '#1E2631' }} />
              <Skeleton width={12} height={12} borderRadius={6} />
            </View>
            <View style={styles.cargoDetailsRoutePoint}>
              <Skeleton width={16} height={16} borderRadius={8} />
              <Skeleton width={150} height={16} borderRadius={4} />
            </View>
          </View>
          {/* Quick Meta */}
          <View style={styles.cargoDetailsQuickMeta}>
            {[1,2,3].map(i => (
              <View key={i} style={styles.cargoDetailsQuickMetaItem}>
                <Skeleton width={16} height={16} borderRadius={8} />
                <Skeleton width={100} height={14} borderRadius={4} />
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Status Bar Skeleton */}
      <View style={styles.cargoDetailsStatusBar}>
        <View style={styles.cargoDetailsStatusCell}>
          <Skeleton width={100} height={14} borderRadius={4} />
          <Skeleton width={80} height={24} borderRadius={999} />
        </View>
        <View style={styles.cargoDetailsStatusDivider} />
        <View style={styles.cargoDetailsStatusCell}>
          <Skeleton width={100} height={14} borderRadius={4} />
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Skeleton width={60} height={18} borderRadius={4} />
            <Skeleton width={16} height={16} borderRadius={8} />
          </View>
        </View>
      </View>

      {/* Sender Section Skeleton */}
      <Skeleton width={120} height={20} borderRadius={4} />
      <View style={styles.cargoDetailsSenderCard}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={{ flex: 1, gap: 4 }}>
          <Skeleton width={140} height={18} borderRadius={4} />
          <Skeleton width={100} height={14} borderRadius={4} />
        </View>
      </View>

      {/* Info Rows Skeleton */}
      {[1,2,3,4,5].map(i => (
        <View key={i} style={styles.cargoDetailsInfoRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Skeleton width={20} height={20} borderRadius={10} />
            <Skeleton width={100} height={16} borderRadius={4} />
          </View>
          <Skeleton width={150} height={16} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonVehicleDetails() {
  return (
    <View style={{ gap: 16, paddingHorizontal: 16 }}>
      {/* Summary Card Skeleton */}
      <View style={styles.vehicleDetailsSummaryCard}>
        <View style={styles.vehicleDetailsImageWrap}>
          <Skeleton width={100} height={100} borderRadius={12} />
        </View>
        <View style={styles.vehicleDetailsSummaryMain}>
          <Skeleton width={200} height={24} borderRadius={4} />
          <Skeleton width={80} height={18} borderRadius={4} style={{ marginTop: 6 }} />
          <View style={[styles.vehicleDetailsQuickMeta, { marginTop: 8 }]}>
            <View style={styles.vehicleDetailsQuickMetaItem}>
              <Skeleton width={16} height={16} borderRadius={8} />
              <Skeleton width={120} height={14} borderRadius={4} />
            </View>
            <View style={styles.vehicleDetailsQuickMetaItem}>
              <Skeleton width={16} height={16} borderRadius={8} />
              <Skeleton width={80} height={14} borderRadius={4} />
            </View>
          </View>
        </View>
      </View>

      {/* Status Bar Skeleton */}
      <View style={styles.vehicleDetailsStatusBar}>
        <View style={styles.vehicleDetailsStatusCell}>
          <Skeleton width={100} height={14} borderRadius={4} />
          <Skeleton width={80} height={24} borderRadius={999} />
        </View>
        <View style={styles.vehicleDetailsStatusDivider} />
        <View style={styles.vehicleDetailsStatusCell}>
          <Skeleton width={100} height={14} borderRadius={4} />
          <Skeleton width={60} height={20} borderRadius={4} />
        </View>
      </View>

      {/* Driver Section Skeleton */}
      <Skeleton width={140} height={20} borderRadius={4} />
      <View style={styles.vehicleDetailsDriverCard}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={{ flex: 1, gap: 4 }}>
          <Skeleton width={140} height={18} borderRadius={4} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Skeleton width={16} height={16} borderRadius={8} />
            <Skeleton width={40} height={14} borderRadius={4} />
          </View>
        </View>
      </View>

      {/* About Section Skeleton */}
      <Skeleton width={140} height={20} borderRadius={4} />
      <View style={styles.vehicleDetailsInfoCard}>
        {[1,2,3,4].map(i => (
        <View key={i} style={styles.vehicleDetailsInfoRow}>
          <Skeleton width={32} height={32} borderRadius={8} />
          <View style={{ flex: 1, gap: 2 }}>
            <Skeleton width={80} height={14} borderRadius={4} />
            <Skeleton width={160} height={18} borderRadius={4} />
          </View>
        </View>
      ))}
      </View>

      {/* Location Section Skeleton */}
      <Skeleton width={100} height={20} borderRadius={4} />
      <View style={styles.vehicleDetailsLocationCard}>
        <Skeleton width={32} height={32} borderRadius={8} />
        <View style={{ flex: 1, gap: 2 }}>
          <Skeleton width={100} height={14} borderRadius={4} />
          <Skeleton width={200} height={18} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonDriverDetails() {
  return (
    <View style={{ gap: 16, paddingHorizontal: 16 }}>
      {/* Summary Card Skeleton */}
      <View style={styles.driverDetailsSummaryCard}>
        <View style={styles.driverDetailsImageWrap}>
          <Skeleton width={100} height={100} borderRadius={12} />
        </View>
        <View style={styles.driverDetailsSummaryMain}>
          <Skeleton width={180} height={24} borderRadius={4} />
          <View style={styles.driverDetailsStatusBar}>
            <View style={styles.driverDetailsStatusCell}>
              <Skeleton width={100} height={14} borderRadius={4} />
              <Skeleton width={80} height={24} borderRadius={999} />
            </View>
            <View style={styles.driverDetailsStatusDivider} />
            <View style={styles.driverDetailsStatusCell}>
              <Skeleton width={50} height={14} borderRadius={4} />
              <Skeleton width={60} height={20} borderRadius={4} />
            </View>
          </View>
          <View style={styles.driverDetailsMetaGrid}>
            {[1,2,3].map(i => (
              <View key={i} style={styles.driverDetailsMetaCard}>
                <Skeleton width={20} height={20} borderRadius={10} />
                <Skeleton width={40} height={20} borderRadius={4} />
                <Skeleton width={60} height={14} borderRadius={4} />
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Assigned Vehicles Skeleton */}
      <Skeleton width={140} height={20} borderRadius={4} />
      <View style={styles.driverDetailsVehicleCard}>
        <Skeleton width={60} height={60} borderRadius={10} />
        <View style={styles.driverDetailsVehicleMain}>
          <Skeleton width={150} height={18} borderRadius={4} />
          <Skeleton width={80} height={14} borderRadius={4} />
          <View style={styles.driverDetailsUnassignButton}>
            <Skeleton width={16} height={16} borderRadius={8} />
            <Skeleton width={60} height={14} borderRadius={4} />
          </View>
        </View>
      </View>

      {/* Available Vehicles Skeleton */}
      <Skeleton width={120} height={20} borderRadius={4} />
      <View style={styles.driverDetailsVehicleCard}>
        <Skeleton width={60} height={60} borderRadius={10} />
        <View style={styles.driverDetailsVehicleMain}>
          <Skeleton width={150} height={18} borderRadius={4} />
          <Skeleton width={80} height={14} borderRadius={4} />
          <View style={styles.driverDetailsAssignButton}>
            <Skeleton width={16} height={16} borderRadius={8} />
            <Skeleton width={60} height={14} borderRadius={4} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#1E2631',
  },
  card: {
    backgroundColor: '#111824',
    borderWidth: 1,
    borderColor: '#273241',
    borderRadius: 14,
    padding: 10,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  proposalCard: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  proposalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  proposalCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  proposalCardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  notificationIconWrap: {
    alignSelf: 'flex-start',
  },
  notificationMain: {
    flex: 1,
    gap: 4,
  },
  notificationTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cargoDetailsSummaryCard: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },
  cargoDetailsImageWrap: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  cargoDetailsSummaryMain: {
    flex: 1,
    gap: 8,
  },
  cargoDetailsCompleteBadge: {
    alignSelf: 'flex-start',
  },
  cargoDetailsRouteBlock: {
    marginTop: 12,
    gap: 4,
  },
  cargoDetailsRoutePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cargoDetailsRouteConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 6,
    gap: 8,
  },
  cargoDetailsQuickMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  cargoDetailsQuickMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cargoDetailsStatusBar: {
    flexDirection: 'row',
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    padding: 12,
  },
  cargoDetailsStatusCell: {
    flex: 1,
    gap: 8,
    alignItems: 'flex-start',
  },
  cargoDetailsStatusDivider: {
    width: 1,
    backgroundColor: '#273444',
    marginHorizontal: 12,
  },
  cargoDetailsSenderCard: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  cargoDetailsInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#273444',
  },
  vehicleDetailsSummaryCard: {
    flexDirection: 'row',
    gap: 12,
  },
  vehicleDetailsImageWrap: {
    position: 'relative',
  },
  vehicleDetailsSummaryMain: {
    flex: 1,
    gap: 6,
    justifyContent: 'center',
  },
  vehicleDetailsQuickMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  vehicleDetailsQuickMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vehicleDetailsStatusBar: {
    flexDirection: 'row',
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    overflow: 'hidden',
  },
  vehicleDetailsStatusCell: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  vehicleDetailsStatusDivider: {
    width: 1,
    backgroundColor: '#273444',
  },
  vehicleDetailsDriverCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  vehicleDetailsInfoCard: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    overflow: 'hidden',
  },
  vehicleDetailsInfoRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    alignItems: 'flex-start',
  },
  vehicleDetailsLocationCard: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverDetailsSummaryCard: {
    flexDirection: 'row',
    gap: 12,
  },
  driverDetailsImageWrap: {
    position: 'relative',
  },
  driverDetailsSummaryMain: {
    flex: 1,
    gap: 6,
    justifyContent: 'center',
  },
  driverDetailsStatusBar: {
    flexDirection: 'row',
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273241',
    borderRadius: 14,
    overflow: 'hidden',
  },
  driverDetailsStatusCell: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  driverDetailsStatusDivider: {
    width: 1,
    backgroundColor: '#273241',
  },
  driverDetailsMetaGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  driverDetailsMetaCard: {
    flex: 1,
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273241',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  driverDetailsVehicleCard: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273241',
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  driverDetailsVehicleMain: {
    flex: 1,
    gap: 4,
  },
  driverDetailsAssignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  driverDetailsUnassignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
});
