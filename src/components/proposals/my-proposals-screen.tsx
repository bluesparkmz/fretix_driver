import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopAppHeader } from '@/components/top-app-header';
import { FlowScreenHeader } from '@/components/wallet/flow-screen-header';
import { SkeletonProposalList } from '@/components/SkeletonLoader';
import { withAlpha } from '@/components/wallet/utils';
import { FretixColors } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';
import { ProposalStatus } from '@/services/proposals';

type ProposalStatusFilter = 'todos' | ProposalStatus;

const statusTabs: { key: ProposalStatusFilter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendente', label: 'Pendentes' },
  { key: 'em_negociacao', label: 'Negociacao' },
  { key: 'aceite', label: 'Aceitas' },
  { key: 'recusada', label: 'Recusadas' },
];

function statusLabel(status: ProposalStatus) {
  switch (status) {
    case 'pendente':
      return { text: 'Aguardando resposta', color: FretixColors.yellow, bg: withAlpha(FretixColors.yellow, 0.16) };
    case 'em_negociacao':
      return { text: 'Em negociacao', color: '#93C5FD', bg: withAlpha('#3B82F6', 0.16) };
    case 'aceite':
      return { text: 'Aceita', color: '#22C55E', bg: withAlpha('#22C55E', 0.16) };
    case 'recusada':
      return { text: 'Recusada', color: '#EF4444', bg: withAlpha('#EF4444', 0.16) };
  }
}

function formatValue(value: number | null) {
  return `${(value ?? 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

type MyProposalsScreenProps = {
  variant?: 'tab' | 'flow';
};

export function MyProposalsScreen({ variant = 'flow' }: MyProposalsScreenProps) {
  const [activeStatus, setActiveStatus] = useState<ProposalStatusFilter>('todos');
  const { myProposals, loadMyProposalsIfNeeded, refreshMyProposals } = useAppData();

  useEffect(() => {
    loadMyProposalsIfNeeded();
  }, [loadMyProposalsIfNeeded]);

  const proposals = myProposals.data;

  const filtered = useMemo(
    () => activeStatus === 'todos'
      ? proposals
      : proposals.filter((proposal) => proposal.status === activeStatus),
    [activeStatus, proposals],
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={myProposals.isRefreshing}
              onRefresh={refreshMyProposals}
              colors={[FretixColors.yellow]}
              tintColor={FretixColors.yellow}
            />
          }>
          {variant === 'tab' ? (
            <>
              <TopAppHeader />
              <Text style={styles.pageTitle}>Minhas propostas</Text>
            </>
          ) : (
            <FlowScreenHeader title="Minhas propostas" />
          )}

          <Text style={styles.roleHint}>Empresa transportadora</Text>

          {/* Tabs de filtro */}
          <View style={styles.tabsContainer}>
            {statusTabs.map((tab) => {
              const isActive = activeStatus === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={[styles.tab, isActive && styles.tabActive]}
                  onPress={() => setActiveStatus(tab.key)}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.list}>
            {myProposals.isLoading ? (
              <SkeletonProposalList count={3} />
            ) : filtered.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma proposta encontrada</Text>
            ) : (
              filtered.map((proposal) => {
                const badge = statusLabel(proposal.status);
                const load = proposal.load;
                return (
                  <View key={proposal.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitleWrap}>
                        <Text style={styles.cargoId}>#{load.code}</Text>
                        <Text style={styles.route}>{load.origin} {'->'} {load.destination}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.text}</Text>
                      </View>
                    </View>

                    <View style={styles.cardBody}>
                      <View>
                        <Text style={styles.proposalLabel}>Sua proposta</Text>
                        <Text style={styles.proposalAmount}>{formatValue(proposal.proposed_value)}</Text>
                      </View>
                      <View style={styles.durationBadge}>
                        <Text style={styles.durationText}>{proposal.vehicle?.plate ?? 'Sem camiao'}</Text>
                      </View>
                    </View>

                    <Text style={styles.sentAt}>Enviada em {formatDate(proposal.created_at)}</Text>

                    <View style={styles.cardActions}>
                      <Pressable
                        style={styles.detailsButton}
                        onPress={() => router.push({ pathname: '/cargo-details', params: { id: load.id, from: 'my-proposals' } })}
                        accessibilityRole="button">
                        <Text style={styles.detailsButtonText}>Ver carga</Text>
                      </Pressable>
                      {(proposal.status === 'pendente' || proposal.status === 'em_negociacao') && (
                        <Pressable
                          style={styles.negotiateButton}
                          onPress={() =>
                            router.push({
                              pathname: '/negotiation',
                              params: { proposalId: String(proposal.id) },
                            })
                          }
                          accessibilityRole="button">
                          <Text style={styles.negotiateButtonText}>Negociar</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
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
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 14,
  },
  pageTitle: {
    color: FretixColors.white,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  roleHint: {
    color: FretixColors.grayLight,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: -4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#111723',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#273241',
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 999,
  },
  tabActive: {
    backgroundColor: FretixColors.yellow,
  },
  tabText: {
    color: '#8D949E',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#101217',
  },
  list: {
    gap: 12,
  },
  loadingBox: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: FretixColors.grayLight,
    textAlign: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  cargoId: {
    color: FretixColors.yellow,
    fontSize: 12,
    fontWeight: '700',
  },
  route: {
    color: FretixColors.white,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  proposalLabel: {
    color: FretixColors.grayLight,
    fontSize: 11,
  },
  proposalAmount: {
    color: FretixColors.white,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  durationBadge: {
    backgroundColor: withAlpha('#3B82F6', 0.2),
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  durationText: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '700',
  },
  sentAt: {
    color: '#6B7280',
    fontSize: 11,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  detailsButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: FretixColors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  negotiateButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: FretixColors.yellow,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  negotiateButtonText: {
    color: FretixColors.yellow,
    fontSize: 13,
    fontWeight: '700',
  },
});
