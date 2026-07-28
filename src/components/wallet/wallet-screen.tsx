import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FretixColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { walletService, type Transaction } from '@/services/wallet';

import { MPESA_TEST_MSISDN } from '@/constants/mpesa';
import { DepositModal } from './deposit-modal';
import { withAlpha } from './utils';

const mapTransactionType = (type: string) => {
  switch (type.toLowerCase()) {
    case 'deposit':
      return { icon: 'arrow-down' as const, color: '#22C55E', bg: withAlpha('#22C55E', 0.16), label: 'Depósito' };
    case 'withdrawal':
      return { icon: 'arrow-up' as const, color: '#A855F7', bg: withAlpha('#A855F7', 0.16), label: 'Saque' };
    default:
      return { icon: 'time' as const, color: FretixColors.yellow, bg: withAlpha(FretixColors.yellow, 0.16), label: 'Pendente' };
  }
};

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-MZ', { day: 'numeric', month: 'short' });
    }
  } catch {
    return '';
  }
};

/** Wallet — balance breakdown and transaction history. */
export function WalletScreen() {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [isDepositModalVisible, setIsDepositModalVisible] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { wallet, getWallet, user } = useAuth();

  const totalBalance = (wallet?.available_balance || 0) + (wallet?.pending_balance || 0) + (wallet?.blocked_balance || 0);
  const currency = wallet?.currency || 'MT';

  const formatBalance = (value: number) => value.toLocaleString('pt-MZ', { minimumFractionDigits: 2 });

  const balanceText = balanceVisible 
    ? `${formatBalance(totalBalance)} ${currency}`
    : '••••••••';

  const availableText = balanceVisible 
    ? `${formatBalance(wallet?.available_balance || 0)} ${currency}`
    : '••••••••';

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    try {
      setIsLoadingTransactions(true);
      const data = await walletService.getTransactions(20, 0);
      setTransactions(data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await getWallet();
      await loadTransactions();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleDepositSuccess() {
    // Recarregar dados após depósito bem-sucedido
    await handleRefresh();
    setIsDepositModalVisible(false);
  }

  const dynamicBalanceBreakdown = [
    { 
      label: 'Disponivel para saque', 
      value: `${formatBalance(wallet?.available_balance || 0)} ${currency}`, 
      color: '#22C55E', 
      info: false 
    },
    { 
      label: 'Em processamento', 
      value: `${formatBalance(wallet?.pending_balance || 0)} ${currency}`, 
      color: FretixColors.white, 
      info: true 
    },
    { 
      label: 'Bloqueado', 
      value: `${formatBalance(wallet?.blocked_balance || 0)} ${currency}`, 
      color: FretixColors.white, 
      info: true 
    },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView 
          contentContainerStyle={styles.content} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          <FlowScreenHeader title="Carteira" />

          <View style={styles.heroCard}>
            <View style={styles.heroContent}>
              <View style={styles.heroLabelRow}>
                <Text style={styles.heroLabel}>Saldo total</Text>
                <Pressable
                  onPress={() => setBalanceVisible((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={balanceVisible ? 'Ocultar saldo' : 'Mostrar saldo'}>
                  <Ionicons
                    name={balanceVisible ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color="#101217"
                  />
                </Pressable>
              </View>
              <Text style={styles.heroValue}>{balanceText}</Text>
              <Text style={styles.heroSub}>
                Disponivel para saque {availableText}
              </Text>
            </View>
            <View style={styles.heroGraphic}>
              <View style={styles.coinsStack}>
                <View style={[styles.coin, styles.coinBack]} />
                <View style={[styles.coin, styles.coinFront]} />
              </View>
              <Ionicons name="wallet" size={40} color="#101217" style={styles.heroWalletIcon} />
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable 
              style={styles.depositButton} 
              accessibilityRole="button"
              onPress={() => setIsDepositModalVisible(true)}
            >
              <Ionicons name="add" size={18} color={FretixColors.yellow} />
              <Text style={styles.depositButtonText}>Depositar</Text>
            </Pressable>
            <Pressable style={styles.withdrawButton} accessibilityRole="button">
              <Ionicons name="arrow-up" size={18} color={FretixColors.yellow} />
              <Text style={styles.withdrawButtonText}>Sacar</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Detalhamento do saldo</Text>
          <View style={styles.breakdownCard}>
            {dynamicBalanceBreakdown.map((row) => (
              <View key={row.label} style={styles.breakdownRow}>
                <View style={styles.breakdownLabelWrap}>
                  <Text style={styles.breakdownLabel}>{row.label}</Text>
                  {row.info && (
                    <Ionicons name="information-circle-outline" size={14} color="#6B7280" />
                  )}
                </View>
                <Text style={[styles.breakdownValue, { color: row.color }]}>{row.value}</Text>
              </View>
            ))}
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownTotalLabel}>Saldo total</Text>
              <Text style={styles.breakdownTotalValue}>{balanceText}</Text>
            </View>
          </View>

          <View style={styles.transactionsHeader}>
            <Text style={styles.sectionTitle}>Transacoes recentes</Text>
            <Pressable accessibilityRole="button">
              <Text style={styles.seeAllLink}>Ver todas</Text>
            </Pressable>
          </View>

          {isLoadingTransactions ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={FretixColors.yellow} />
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color="#6B7280" />
              <Text style={styles.emptyStateText}>Nenhuma transação</Text>
            </View>
          ) : (
            <View style={styles.transactionsCard}>
              {transactions.map((tx, index) => {
                const typeInfo = mapTransactionType(tx.transaction_type);
                const amountSign = tx.transaction_type.toLowerCase() === 'deposit' ? '+' : '-';
                const amountColor = tx.transaction_type.toLowerCase() === 'deposit' ? '#22C55E' : '#EF4444';

                return (
                  <View
                    key={tx.id}
                    style={[styles.transactionRow, index < transactions.length - 1 && styles.transactionBorder]}>
                    <View style={[styles.transactionIconWrap, { backgroundColor: typeInfo.bg }]}>
                      <Ionicons name={typeInfo.icon} size={18} color={typeInfo.color} />
                    </View>
                    <View style={styles.transactionMain}>
                      <Text style={styles.transactionTitle}>{typeInfo.label}</Text>
                      {tx.description && (
                        <Text style={styles.transactionSubtitle}>{tx.description}</Text>
                      )}
                      <Text style={styles.transactionDate}>{formatDate(tx.created_at)}</Text>
                    </View>
                    <Text style={[styles.transactionAmount, { color: amountColor }]}>
                      {amountSign}{formatBalance(tx.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Modal de Depósito */}
      <DepositModal
        visible={isDepositModalVisible}
        onClose={() => setIsDepositModalVisible(false)}
        onSuccess={handleDepositSuccess}
        userPhone={user?.phone || MPESA_TEST_MSISDN}
        currentBalance={wallet?.available_balance ?? 0}
      />
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
    gap: 16,
  },
  heroCard: {
    marginTop: 8,
    backgroundColor: FretixColors.yellow,
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 140,
  },
  heroContent: {
    flex: 1,
    gap: 6,
    zIndex: 1,
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroLabel: {
    color: '#101217',
    fontSize: 13,
    fontWeight: '600',
  },
  heroValue: {
    color: '#101217',
    fontSize: 30,
    fontWeight: '800',
  },
  heroSub: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '600',
  },
  heroGraphic: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroWalletIcon: {
    opacity: 0.85,
  },
  coinsStack: {
    position: 'absolute',
    right: 4,
    top: 8,
  },
  coin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#101217',
    borderWidth: 3,
    borderColor: '#FDE68A',
  },
  coinBack: {
    position: 'absolute',
    right: 12,
    top: 0,
    opacity: 0.5,
  },
  coinFront: {
    position: 'absolute',
    right: 0,
    top: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  depositButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#101217',
    borderRadius: 12,
    paddingVertical: 14,
  },
  depositButtonText: {
    color: FretixColors.yellow,
    fontSize: 15,
    fontWeight: '700',
  },
  withdrawButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: FretixColors.black,
    borderWidth: 1,
    borderColor: FretixColors.yellow,
    borderRadius: 12,
    paddingVertical: 14,
  },
  withdrawButtonText: {
    color: FretixColors.yellow,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    color: FretixColors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  breakdownCard: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  breakdownLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  breakdownLabel: {
    color: FretixColors.grayLight,
    fontSize: 13,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#273444',
  },
  breakdownTotalLabel: {
    color: FretixColors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  breakdownTotalValue: {
    color: '#22C55E',
    fontSize: 15,
    fontWeight: '700',
  },
  transactionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  seeAllLink: {
    color: FretixColors.yellow,
    fontSize: 13,
    fontWeight: '600',
  },
  transactionsCard: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    overflow: 'hidden',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  transactionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#273444',
  },
  transactionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionMain: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  transactionTitle: {
    color: FretixColors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  transactionSubtitle: {
    color: FretixColors.grayLight,
    fontSize: 11,
  },
  transactionDate: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 0,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
});
