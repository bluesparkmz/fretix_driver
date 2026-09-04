import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable as RNPressable } from 'react-native';
import {
    ActivityIndicator,
    FlatList, Image, Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopAppHeader } from '@/components/top-app-header';
import { TripStatusBadge, type LoadStatusType } from '@/components/trip-status-indicator';
import { LoadTypeImage } from '@/components/load-type-image';
import { BottomTabInset, FretixColors } from '@/constants/theme';
import { useWebSocket } from '@/context/WebSocketContext';
import { tripService, type Trip } from '@/services/trips';
import { buildReturnTo, pushWithReturnTo } from '@/utils/navigation';

type TripFilterTab = {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    statuses: string[];
};

const tripFilterTabs: TripFilterTab[] = [
    { label: 'Todas', icon: 'albums-outline', statuses: ['aguardando_inicio', 'indo_carregar', 'chegou_origem', 'carregado', 'viagem_iniciada', 'aguardando_cliente', 'concluida', 'cancelado'] },
    { label: 'Em andamento', icon: 'car-outline', statuses: ['aguardando_inicio', 'indo_carregar', 'chegou_origem', 'carregado', 'viagem_iniciada', 'aguardando_cliente'] },
    { label: 'Concluídas', icon: 'checkmark-done-outline', statuses: ['concluida'] },
    { label: 'Canceladas', icon: 'close-circle-outline', statuses: ['cancelado'] },
];

export default function TripsScreen() {
    const { addListenerForTypes } = useWebSocket();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [activeTab, setActiveTab] = useState(tripFilterTabs[0].label);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadTrips = async () => {
        try {
            setLoading(true);
            const data = await tripService.getMyTrips();
            setTrips(data);
        } catch (error) {
            console.error('Failed to load trips:', error);
            setTrips([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        void loadTrips();
    }, []);

    useEffect(() => {
        const unsubscribe = addListenerForTypes(['trip.status_changed', 'trip.location'], (event) => {
            if (typeof event.trip_id !== 'number') return;

            setTrips((currentTrips) =>
                currentTrips.map((trip) => {
                    if (trip.id !== event.trip_id) return trip;

                    if (event.type === 'trip.status_changed' && typeof event.status === 'string') {
                        return {
                            ...trip,
                            status: event.status,
                        };
                    }

                    if (event.type === 'trip.location') {
                        return {
                            ...trip,
                            status: typeof event.status === 'string' ? event.status : trip.status,
                        };
                    }

                    return trip;
                }),
            );
        });

        return unsubscribe;
    }, [addListenerForTypes]);

    const onRefresh = () => {
        setRefreshing(true);
        void loadTrips();
    };

    const filteredTrips = useMemo(() => {
        const activeFilter = tripFilterTabs.find((tab) => tab.label === activeTab);
        if (!activeFilter || activeTab === 'Todas') {
            return trips;
        }
        return trips.filter((trip) => activeFilter.statuses.includes(trip.status));
    }, [activeTab, trips]);

    const tripCount = filteredTrips.length;

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <TopAppHeader />

                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Viagens</Text>
                        <Text style={styles.subtitle}>Acompanhe o estado das suas viagens.</Text>
                    </View>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{tripCount} viagens</Text>
                    </View>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabsContainer}
                    style={styles.tabsScroll}
                >
                    {tripFilterTabs.map((tab) => (
                        <Pressable
                            key={tab.label}
                            style={[styles.tabPill, tab.label === activeTab && styles.tabPillActive]}
                            onPress={() => setActiveTab(tab.label)}
                        >
                            <Ionicons
                                name={tab.icon}
                                size={14}
                                color={tab.label === activeTab ? '#101217' : '#AAB2BE'}
                            />
                            <Text style={[styles.tabText, tab.label === activeTab && styles.tabTextActive]}>
                                {tab.label}
                            </Text>
                        </Pressable>
                    ))}
                </ScrollView>

                {loading ? (
                    <View style={styles.loader}>
                        <ActivityIndicator size="large" color={FretixColors.yellow} />
                    </View>
                ) : (
                    <FlatList
                        data={filteredTrips}
                        keyExtractor={(item) => String(item.id)}
                        contentContainerStyle={styles.content}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={FretixColors.yellow}
                                colors={[FretixColors.yellow]}
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="car-outline" size={48} color={FretixColors.grayLight} />
                                <Text style={styles.emptyTitle}>Nenhuma viagem encontrada</Text>
                                <Text style={styles.emptySubtitle}>
                                    As viagens atribuídas ao seu perfil ou ao seu camião aparecerão aqui.
                                </Text>
                            </View>
                        }
                        renderItem={({ item }) => (
                            <RNPressable
                                style={styles.card}
                                onPress={() =>
                                    pushWithReturnTo(
                                        '/trip_details',
                                        { id: item.id },
                                        buildReturnTo('/trips'),
                                    )
                                }
                            >
                                <View style={styles.cardTopRow}>
                                    <View style={styles.imgWrap}>
                                        <Image
                                            source={
                                                item.vehicle?.photo
                                                    ? { uri: item.vehicle.photo }
                                                    : require('../../assets/camiao_cover.png')
                                            }
                                            style={styles.img}
                                            resizeMode="cover"
                                        />
                                        <View style={styles.imgBadge}>
                                            <LoadTypeImage loadType={item.load_type ?? ''} style={styles.imgBadgeImg} fallbackIconSize={14} />
                                        </View>
                                    </View>

                                    <View style={styles.cardInfoRow}>
                                        <Text style={styles.cardTitle}>Viagem #{item.id}</Text>
                                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                                            {item.vehicle?.plate ? `Matrícula ${item.vehicle.plate}` : item.load_code || 'Carga sem código'}
                                        </Text>
                                    </View>

                                    <TripStatusBadge status={mapStatus(item.status)} />
                                </View>

                                <View style={styles.cardMeta}>
                                    <View style={styles.metaItem}>
                                        <Text style={styles.metaLabel}>Origem</Text>
                                        <Text style={styles.metaValue}>{item.origin}</Text>
                                    </View>
                                    <View style={styles.metaItem}>
                                        <Text style={styles.metaLabel}>Destino</Text>
                                        <Text style={styles.metaValue}>{item.destination}</Text>
                                    </View>
                                </View>

                                <View style={styles.cardMeta}>
                                    <View style={styles.metaItem}>
                                        <Text style={styles.metaLabel}>Cliente</Text>
                                        <Text style={styles.metaValue}>{item.client_name || '—'}</Text>
                                    </View>
                                    <View style={styles.metaItem}>
                                        <Text style={styles.metaLabel}>Criada</Text>
                                        <Text style={styles.metaValue}>{formatDate(item.created_at)}</Text>
                                    </View>
                                </View>
                            </RNPressable>
                        )}
                    />
                )}
            </SafeAreaView>
        </View>
    );
}

function mapStatus(status: string): LoadStatusType {
    switch (status) {
        case 'aguardando_inicio':
            return 'disponivel';
        case 'indo_carregar':
            return 'indo_carregar';
        case 'chegou_origem':
            return 'chegou_origem';
        case 'carregado':
            return 'carregado';
        case 'viagem_iniciada':
            return 'em_viagem';
        case 'aguardando_cliente':
            return 'em_andamento';
        case 'concluida':
            return 'concluido';
        case 'cancelado':
            return 'cancelado';
        default:
            return 'disponivel';
    }
}

function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
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
        paddingHorizontal: 16,
        paddingTop: 18,
        paddingBottom: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        color: FretixColors.white,
        fontSize: 24,
        fontWeight: '700',
    },
    subtitle: {
        color: FretixColors.grayLight,
        fontSize: 13,
        marginTop: 4,
    },
    badge: {
        backgroundColor: '#111824',
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 14,
    },
    badgeText: {
        color: FretixColors.white,
        fontSize: 12,
        fontWeight: '700',
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: BottomTabInset + 16,
        gap: 12,
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        marginTop: 80,
        gap: 12,
    },
    emptyTitle: {
        color: FretixColors.white,
        fontSize: 18,
        fontWeight: '700',
        marginTop: 14,
    },
    emptySubtitle: {
        color: FretixColors.grayLight,
        fontSize: 13,
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#111824',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#273241',
        padding: 16,
        gap: 14,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    imgWrap: {
        width: 68,
        height: 68,
        position: 'relative',
        flexShrink: 0,
    },
    img: {
        width: 68,
        height: 68,
        borderRadius: 12,
        backgroundColor: '#0D1118',
    },
    imgBadge: {
        position: 'absolute',
        right: -4,
        bottom: -4,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#131E2C',
        borderWidth: 2,
        borderColor: '#2A3A50',
        overflow: 'hidden',
    },
    imgBadgeImg: {
        width: '100%',
        height: '100%',
        borderRadius: 14,
    },
    cardInfo: {
        flex: 1,
        gap: 6,
    },
    cardInfoRow: {
        flex: 1,
        justifyContent: 'center',
        gap: 4,
    },
    cardTitle: {
        color: FretixColors.white,
        fontSize: 16,
        fontWeight: '700',
    },
    cardSubtitle: {
        color: FretixColors.grayLight,
        fontSize: 13,
    },
    cardMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    metaItem: {
        flex: 1,
        gap: 4,
    },
    metaLabel: {
        color: '#6B7280',
        fontSize: 11,
    },
    metaValue: {
        color: FretixColors.white,
        fontSize: 13,
        fontWeight: '600',
    },
    tabsScroll: {
        marginHorizontal: 16,
        marginBottom: 14,
        backgroundColor: '#111723',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#263242',
        height: 46,
        maxHeight: 46,
        flexShrink: 0,
        overflow: 'hidden',
    },
    tabsContainer: {
        padding: 3,
        flexDirection: 'row',
        gap: 4,
        alignItems: 'center',
        minHeight: 40,
    },
    tabPill: {
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 10,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
        height: 34,
    },
    tabPillActive: {
        backgroundColor: FretixColors.yellow,
    },
    tabText: {
        color: '#AAB2BE',
        fontSize: 12,
        fontWeight: '600',
    },
    tabTextActive: {
        color: '#101217',
    },
});
