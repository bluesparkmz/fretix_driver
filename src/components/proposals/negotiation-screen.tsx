import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomDialog } from '@/components/custom-dialog';
import { FlowScreenHeader } from '@/components/wallet/flow-screen-header';
import { withAlpha } from '@/components/wallet/utils';
import { FretixColors } from '@/constants/theme';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { useWebSocket } from '@/context/WebSocketContext';
import {
  ProposalNegotiation,
  ProposalNegotiationDetail,
  proposalService,
} from '@/services/proposals';
import { getApiErrorMessage } from '@/utils/api-error';
import { sameUserId } from '@/utils/user-id';

type NegotiationScreenProps = {
  proposalId: number;
};

function formatValue(value: number | null | undefined) {
  return `${(value ?? 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('pt-MZ', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseAmount(value: string) {
  const normalized = value.replace(',', '.').replace(/[^\d.]/g, '');
  return Number.parseFloat(normalized);
}

function statusStyle(status: string) {
  switch (status) {
    case 'aceite':
      return { text: 'Aceite', color: '#22C55E', bg: withAlpha('#22C55E', 0.16) };
    case 'recusada':
      return { text: 'Recusada', color: '#EF4444', bg: withAlpha('#EF4444', 0.16) };
    case 'substituida':
      return { text: 'Substituida', color: '#8D949E', bg: withAlpha('#8D949E', 0.16) };
    default:
      return { text: 'Pendente', color: FretixColors.yellow, bg: withAlpha(FretixColors.yellow, 0.16) };
  }
}

function proposalStatusStyle(status: string) {
  switch (status) {
    case 'pendente':
      return { text: 'Pendente', color: FretixColors.yellow, bg: withAlpha(FretixColors.yellow, 0.16) };
    case 'em_negociacao':
      return { text: 'Em Negociação', color: '#93C5FD', bg: withAlpha('#3B82F6', 0.16) };
    case 'aceite':
      return { text: 'Aceita', color: '#22C55E', bg: withAlpha('#22C55E', 0.16) };
    case 'recusada':
      return { text: 'Recusada', color: '#EF4444', bg: withAlpha('#EF4444', 0.16) };
    default:
      return { text: status, color: FretixColors.grayLight, bg: withAlpha(FretixColors.grayLight, 0.16) };
  }
}

export function NegotiationScreen({ proposalId }: NegotiationScreenProps) {
  const { user, isCompany, isClient } = useAuth();
  const { refreshMyProposals, refreshReceivedProposals } = useAppData();
  const { subscribeProposal, addListenerForTypes } = useWebSocket();
  const [detail, setDetail] = useState<ProposalNegotiationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const amountInitializedRef = useRef(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogProps, setDialogProps] = useState<{
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
    showCancel?: boolean;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }>({
    title: '',
    message: '',
    type: 'info',
  });

  const showDialog = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
    options?: {
      showCancel?: boolean;
      confirmText?: string;
      cancelText?: string;
      onConfirm?: () => void;
    },
  ) => {
    setDialogProps({ title, message, type, ...options });
    setDialogVisible(true);
  };

  const refreshProposalLists = useCallback(async () => {
    await Promise.all([refreshMyProposals(), refreshReceivedProposals()]);
  }, [refreshMyProposals, refreshReceivedProposals]);

  const fetchDetail = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const data = await proposalService.getNegotiations(proposalId);
      setDetail(data);
    } catch (error: any) {
      console.error('Failed to fetch negotiations:', error.response?.data || error.message);
      if (showLoading) {
        showDialog('Erro', getApiErrorMessage(error, 'Nao foi possivel carregar a negociacao.'), 'error');
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [proposalId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    subscribeProposal(proposalId);

    const negotiationEvents = [
      'negotiation.created',
      'negotiation.accepted',
      'negotiation.rejected',
      'negotiation.sent',
      'negotiation.accepted_ack',
      'negotiation.rejected_ack',
      'proposal.accepted',
      'proposal.rejected',
      'proposal.accepted_ack',
      'proposal.rejected_ack',
    ];

    return addListenerForTypes(negotiationEvents, (event) => {
      if (event.proposal_id !== proposalId) return;
      fetchDetail(false);
    });
  }, [addListenerForTypes, fetchDetail, proposalId, subscribeProposal]);

  const proposal = detail?.proposal;
  const negotiations = detail?.negotiations ?? [];
  const loadAllowsNegotiation = proposal?.load?.negotiable !== false;
  const isNegotiationOpen =
    proposal?.status === 'pendente' || proposal?.status === 'em_negociacao';
  const canNegotiate = isNegotiationOpen && loadAllowsNegotiation;

  useEffect(() => {
    amountInitializedRef.current = false;
    setAmount('');
  }, [proposalId]);

  useEffect(() => {
    if (proposal?.proposed_value == null || amountInitializedRef.current) return;
    setAmount(String(proposal.proposed_value));
    amountInitializedRef.current = true;
  }, [proposal?.proposed_value]);

  const latestPending = useMemo(
    () => [...negotiations].reverse().find((item) => item.status === 'pendente') ?? null,
    [negotiations],
  );
  const canSendOffer =
    !!proposal &&
    canNegotiate &&
    (!latestPending || !sameUserId(latestPending.sender_id, user?.id)) &&
    !(isCompany && !latestPending);
  const participant = proposal?.company?.company_name ?? proposal?.driver?.name ?? 'Transportador';
  const proposalBadge = proposal ? proposalStatusStyle(proposal.status) : null;

  const waitingText = useMemo(() => {
    if (!proposal || !canNegotiate) return null;
    if (sameUserId(latestPending?.sender_id, user?.id)) {
      return 'Aguardando resposta da outra parte.';
    }
    if (isCompany && !latestPending) {
      return 'Aguardando o cliente sugerir outro valor ou aceitar a proposta inicial.';
    }
    return null;
  }, [canNegotiate, isCompany, latestPending, proposal, user?.id]);

  const standingAmount = useMemo(() => {
    if (latestPending) return latestPending.amount;
    return proposal?.proposed_value ?? null;
  }, [latestPending, proposal?.proposed_value]);

  const counterOfferHint = useMemo(() => {
    if (!canNegotiate || standingAmount == null) return null;
    if (isClient) {
      return `Sugira um valor inferior a ${formatValue(standingAmount)}`;
    }
    if (isCompany && latestPending) {
      return `Sugira um valor entre ${formatValue(latestPending.amount)} e ${formatValue(proposal?.proposed_value)}`;
    }
    return null;
  }, [canNegotiate, isClient, isCompany, latestPending, proposal?.proposed_value, standingAmount]);

  const validateCounterOffer = useCallback(
    (value: number) => {
      if (standingAmount == null || value <= 0) {
        return 'Informe um valor valido.';
      }
      if (isClient) {
        if (value >= standingAmount) {
          return `O valor deve ser inferior a ${formatValue(standingAmount)}.`;
        }
        return null;
      }
      if (isCompany && latestPending) {
        const ceiling = proposal?.proposed_value ?? standingAmount;
        if (value <= latestPending.amount) {
          return `O valor deve ser superior a ${formatValue(latestPending.amount)}.`;
        }
        if (value > ceiling) {
          return `O valor nao pode ultrapassar a proposta inicial (${formatValue(ceiling)}).`;
        }
        return null;
      }
      return 'Aguarde a contraproposta do cliente.';
    },
    [isClient, isCompany, latestPending, proposal?.proposed_value, standingAmount],
  );

  const handleSendOffer = async () => {
    if (!canSendOffer) return;

    const parsed = parseAmount(amount);
    const validationError = validateCounterOffer(parsed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      showDialog('Valor', 'Informe um valor valido para a contra-proposta.', 'info');
      return;
    }
    if (validationError) {
      showDialog('Valor', validationError, 'info');
      return;
    }

    try {
      setSubmitting(true);
      await proposalService.createCounterOffer(proposalId, parsed);
      setAmount('');
      await fetchDetail(false);
      await refreshProposalLists();
    } catch (error: any) {
      console.error('Failed to send counter-offer:', error.response?.data || error.message);
      showDialog('Erro', getApiErrorMessage(error, 'Nao foi possivel enviar a contra-proposta.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (item: ProposalNegotiation) => {
    try {
      setSubmitting(true);
      await proposalService.acceptNegotiation(proposalId, item.id);
      await fetchDetail(false);
      await refreshProposalLists();
      showDialog('Sucesso', 'Contraproposta aceite. A viagem foi criada.', 'success');
    } catch (error: any) {
      showDialog('Erro', getApiErrorMessage(error, 'Nao foi possivel aceitar a oferta.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = (item: ProposalNegotiation) => {
    showDialog(
      'Recusar contraproposta',
      'Recusar esta contraproposta encerra a proposta. Deseja continuar?',
      'info',
      {
        showCancel: true,
        confirmText: 'Recusar',
        cancelText: 'Cancelar',
        onConfirm: async () => {
          try {
            setSubmitting(true);
            await proposalService.rejectNegotiation(proposalId, item.id);
            await fetchDetail(false);
            await refreshProposalLists();
            showDialog('Proposta recusada', 'A contraproposta foi recusada.', 'info');
          } catch (error: any) {
            showDialog('Erro', getApiErrorMessage(error, 'Nao foi possivel recusar a oferta.'), 'error');
          } finally {
            setSubmitting(false);
          }
        },
      },
    );
  };

  const handleAcceptBaseProposal = async () => {
    showDialog(
      'Aceitar Proposta',
      'Tem certeza que deseja aceitar esta proposta inicial? Isso criará a viagem e recusará outras propostas.',
      'info',
      {
        showCancel: true,
        confirmText: 'Aceitar',
        cancelText: 'Cancelar',
        onConfirm: async () => {
          try {
            setSubmitting(true);
            await proposalService.acceptProposal(proposalId);
            await fetchDetail(false);
            await refreshProposalLists();
            showDialog('Sucesso', 'Proposta aceite com sucesso!', 'success');
          } catch (error: any) {
            console.error('Failed to accept proposal:', error.response?.data || error.message);
            showDialog('Erro', getApiErrorMessage(error, 'Nao foi possivel aceitar a proposta.'), 'error');
          } finally {
            setSubmitting(false);
          }
        },
      },
    );
  };

  const handleRejectBaseProposal = async () => {
    showDialog(
      'Recusar Proposta',
      'Tem certeza que deseja recusar esta proposta?',
      'info',
      {
        showCancel: true,
        confirmText: 'Recusar',
        cancelText: 'Cancelar',
        onConfirm: async () => {
          try {
            setSubmitting(true);
            await proposalService.rejectProposal(proposalId);
            await fetchDetail(false);
            await refreshProposalLists();
            showDialog('Proposta recusada', 'A proposta foi recusada com sucesso.', 'info');
          } catch (error: any) {
            console.error('Failed to reject proposal:', error.response?.data || error.message);
            showDialog('Erro', getApiErrorMessage(error, 'Nao foi possivel recusar a proposta.'), 'error');
          } finally {
            setSubmitting(false);
          }
        },
      },
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <FlowScreenHeader title="Negociacao" onBack={() => router.back()} />

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={FretixColors.yellow} />
            </View>
          ) : proposal ? (
            <>
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <View style={styles.summaryInfo}>
                    <Text style={styles.cargoCode}>#{proposal.load.code}</Text>
                    <Text style={styles.route}>
                      {proposal.load.origin} {'->'} {proposal.load.destination}
                    </Text>
                  </View>
                  {proposalBadge && (
                    <View style={[styles.statusBadge, { backgroundColor: proposalBadge.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: proposalBadge.color }]}>
                        {proposalBadge.text}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.participant}>{participant}</Text>
                <Text style={styles.currentValue}>
                  Valor em vigor: {formatValue(standingAmount ?? proposal.proposed_value)}
                </Text>
                {proposal.load?.value != null ? (
                  <Text style={styles.clientReference}>
                    Valor indicado na carga: {formatValue(proposal.load.value)}
                  </Text>
                ) : null}
              </View>

              {/* Botoes de Decisao do Cliente para a Proposta Base */}
              {!loadAllowsNegotiation && isNegotiationOpen ? (
                <View style={styles.noticeCard}>
                  <Text style={styles.noticeText}>
                    Esta carga nao aceita negociacao de valor. Pode aceitar ou recusar a proposta inicial.
                  </Text>
                </View>
              ) : null}

              {isClient && isNegotiationOpen && (
                <View style={styles.clientActionsRow}>
                  <Pressable
                    style={styles.clientAcceptButton}
                    onPress={handleAcceptBaseProposal}
                    accessibilityRole="button">
                    <Text style={styles.clientAcceptButtonText}>Aceitar Proposta</Text>
                  </Pressable>
                  <Pressable
                    style={styles.clientRejectButton}
                    onPress={handleRejectBaseProposal}
                    accessibilityRole="button">
                    <Text style={styles.clientRejectButtonText}>Recusar Proposta</Text>
                  </Pressable>
                </View>
              )}

              <Text style={styles.sectionTitle}>Historico de valores</Text>
              <View style={styles.list}>
                <View style={styles.offerCard}>
                  <View style={styles.offerHeader}>
                    <View>
                      <Text style={styles.offerAuthor}>{participant}</Text>
                      <Text style={styles.offerDate}>{formatDate(proposal.created_at)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: withAlpha('#3B82F6', 0.16) }]}>
                      <Text style={[styles.statusBadgeText, { color: '#93C5FD' }]}>Proposta inicial</Text>
                    </View>
                  </View>
                  <Text style={styles.offerAmount}>{formatValue(proposal.proposed_value)}</Text>
                </View>

                {negotiations.length === 0 ? (
                  <Text style={styles.emptyText}>Ainda nao ha contra-propostas.</Text>
                ) : (
                  negotiations.map((item) => {
                    const badge = statusStyle(item.status);
                    const isMine = sameUserId(item.sender_id, user?.id);
                    const isPending = item.status === 'pendente';

                    return (
                      <View key={item.id} style={styles.offerCard}>
                        <View style={styles.offerHeader}>
                          <View>
                            <Text style={styles.offerAuthor}>
                              {isMine ? 'Voce' : item.sender_name ?? 'Participante'}
                            </Text>
                            <Text style={styles.offerDate}>{formatDate(item.created_at)}</Text>
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.statusBadgeText, { color: badge.color }]}>
                              {badge.text}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.offerAmount}>{formatValue(item.amount)}</Text>

                        {isPending && !isMine ? (
                          <View style={styles.offerActions}>
                            <Pressable
                              style={styles.acceptButton}
                              onPress={() => handleAccept(item)}
                              accessibilityRole="button">
                              <Text style={styles.acceptButtonText}>Aceitar</Text>
                            </Pressable>
                            <Pressable
                              style={styles.rejectButton}
                              onPress={() => handleReject(item)}
                              accessibilityRole="button">
                              <Text style={styles.rejectButtonText}>Recusar</Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </View>

              {canNegotiate ? (
                <View style={styles.formCard}>
                  <Text style={styles.sectionTitle}>Sugerir outro valor</Text>
                  {counterOfferHint ? <Text style={styles.waitingText}>{counterOfferHint}</Text> : null}
                  {waitingText ? <Text style={styles.waitingText}>{waitingText}</Text> : null}
                  {canSendOffer ? (
                    <>
                      <TextInput
                        style={styles.input}
                        placeholder="Valor (MT)"
                        placeholderTextColor={FretixColors.grayLight}
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                      />
                      <Pressable
                        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                        onPress={handleSendOffer}
                        disabled={submitting}
                        accessibilityRole="button">
                        {submitting ? (
                          <ActivityIndicator size="small" color="#101217" />
                        ) : (
                          <>
                            <Ionicons name="swap-horizontal" size={18} color="#101217" />
                            <Text style={styles.submitButtonText}>Enviar valor</Text>
                          </>
                        )}
                      </Pressable>
                    </>
                  ) : null}
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
      <CustomDialog
        visible={dialogVisible}
        title={dialogProps.title}
        message={dialogProps.message}
        type={dialogProps.type}
        showCancel={dialogProps.showCancel}
        confirmText={dialogProps.confirmText}
        cancelText={dialogProps.cancelText}
        onCancel={() => setDialogVisible(false)}
        onConfirm={() => {
          setDialogVisible(false);
          if (dialogProps.onConfirm) {
            dialogProps.onConfirm();
          }
        }}
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
    gap: 14,
  },
  loadingBox: {
    padding: 24,
    alignItems: 'center',
  },
  summaryCard: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  cargoCode: {
    color: FretixColors.yellow,
    fontSize: 12,
    fontWeight: '700',
  },
  route: {
    color: FretixColors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  participant: {
    color: FretixColors.grayLight,
    fontSize: 13,
  },
  currentValue: {
    color: FretixColors.white,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  clientReference: {
    color: FretixColors.grayLight,
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    color: FretixColors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  list: {
    gap: 10,
  },
  emptyText: {
    color: FretixColors.grayLight,
    textAlign: 'center',
    paddingVertical: 16,
  },
  offerCard: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  offerAuthor: {
    color: FretixColors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  offerDate: {
    color: '#6B7280',
    fontSize: 11,
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
  offerAmount: {
    color: FretixColors.white,
    fontSize: 20,
    fontWeight: '800',
  },
  offerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#22C55E',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#101217',
    fontSize: 13,
    fontWeight: '700',
  },
  rejectButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  formCard: {
    gap: 10,
    marginTop: 4,
  },
  waitingText: {
    color: FretixColors.grayLight,
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: FretixColors.white,
    fontSize: 15,
  },
  submitButton: {
    minHeight: 48,
    backgroundColor: FretixColors.yellow,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#101217',
    fontSize: 14,
    fontWeight: '800',
  },
  noticeCard: {
    backgroundColor: withAlpha(FretixColors.yellow, 0.12),
    borderWidth: 1,
    borderColor: withAlpha(FretixColors.yellow, 0.35),
    borderRadius: 12,
    padding: 12,
  },
  noticeText: {
    color: FretixColors.grayLight,
    fontSize: 13,
    lineHeight: 18,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryInfo: {
    flex: 1,
    gap: 2,
  },
  clientActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  clientAcceptButton: {
    flex: 1,
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAcceptButtonText: {
    color: '#101217',
    fontSize: 14,
    fontWeight: '700',
  },
  clientRejectButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientRejectButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
});
