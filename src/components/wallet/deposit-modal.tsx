import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomDialog } from '@/components/custom-dialog';
import { FretixColors } from '@/constants/theme';
import { MPESA_TEST_MSISDN } from '@/constants/mpesa';
import { walletService, type WalletDepositResponse } from '@/services/wallet';

const DEPOSIT_WAIT_SECONDS = 60;
const DEPOSIT_POLL_MS = 2000;

type DepositStep = 'input' | 'confirm' | 'processing' | 'waiting_pin' | 'success' | 'error';

interface DepositModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (response: WalletDepositResponse) => void;
  userPhone?: string;
  currentBalance?: number;
}

export function DepositModal({ 
  visible, 
  onClose, 
  onSuccess, 
  userPhone,
  currentBalance = 0
}: DepositModalProps) {
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(userPhone || MPESA_TEST_MSISDN);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<DepositStep>('input');
  const [depositResponse, setDepositResponse] = useState<WalletDepositResponse | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(DEPOSIT_WAIT_SECONDS);
  const [pollingCount, setPollingCount] = useState(0);
  const [dialog, setDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showDialog = (title: string, message: string, type: 'success' | 'error' | 'info' = 'error', onConfirm?: () => void) => {
    setDialog({ visible: true, title, message, type, onConfirm });
  };

  const formattedAmount = parseFloat(amount) || 0;
  const isValid = formattedAmount > 0 && phone.length >= 8;

  // Timer para espera de PIN
  useEffect(() => {
    if (step !== 'waiting_pin') return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleWaitTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  // Polling: consulta verificador M-Pesa no backend (máx. 60s, a cada 2s)
  useEffect(() => {
    if (step !== 'waiting_pin' || !depositResponse) return;

    let cancelled = false;

    const checkStatus = async () => {
      try {
        setPollingCount(prev => prev + 1);
        const status = await walletService.syncDeposit(depositResponse.payment_id);

        if (cancelled) return;

        if (status.status === 'completed') {
          setStep('success');
          onSuccess(depositResponse);
        } else if (status.status === 'failed') {
          setStep('error');
          showDialog('Cancelado', status.message || 'Depósito cancelado ou rejeitado.', 'error');
        }
      } catch (error) {
        console.error('Sync deposit error:', error);
      }
    };

    const pollInterval = setInterval(checkStatus, DEPOSIT_POLL_MS);
    checkStatus();

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
    };
  }, [step, depositResponse, onSuccess]);

  async function handleDeposit() {
    if (!isValid) {
      showDialog('Erro', 'Preencha os dados corretamente', 'error');
      return;
    }

    setIsLoading(true);
    try {
      setStep('processing');
      const response = await walletService.createDeposit(formattedAmount, phone);
      setDepositResponse(response);

      if (response.status === 'completed') {
        setStep('success');
        onSuccess(response);
      } else if (response.status === 'failed') {
        setStep('error');
        showDialog('Erro', response.message || 'M-Pesa rejeitou o pagamento', 'error');
      } else {
        setStep('waiting_pin');
        setTimeRemaining(DEPOSIT_WAIT_SECONDS);
      }
    } catch (error: any) {
      setStep('error');
      const errorMsg = error.response?.data?.detail || error.message || 'Erro ao processar depósito';
      console.error('Deposit error:', errorMsg);
      showDialog('Erro', errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  function handleWaitTimeout() {
    setStep('error');
    showDialog(
      'Timeout',
      'Depósito não foi confirmado em 1 minuto. Tente novamente.',
      'error',
      handleClose
    );
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function handleClose() {
    setAmount('');
    setPhone(userPhone || MPESA_TEST_MSISDN);
    setStep('input');
    setDepositResponse(null);
    setTimeRemaining(DEPOSIT_WAIT_SECONDS);
    setPollingCount(0);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={FretixColors.white} />
          </Pressable>
          <Text style={styles.title}>Depositar via M-Pesa</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          {/* Step 1: Input */}
          {step === 'input' && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Valor do depósito</Text>
                <View style={styles.amountContainer}>
                  <Text style={styles.currencyLabel}>MT</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor="#6B7280"
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                    editable={!isLoading}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Número de telemóvel</Text>
                <TextInput
                  style={styles.phoneInput}
                  placeholder={MPESA_TEST_MSISDN}
                  placeholderTextColor="#6B7280"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  editable={!isLoading}
                />
                <Text style={styles.phoneHint}>Número que receberá a confirmação M-Pesa</Text>
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={18} color={FretixColors.yellow} />
                <View style={styles.infoText}>
                  <Text style={styles.infoTitle}>Como funciona</Text>
                  <Text style={styles.infoDesc}>
                    1. Confirma o valor aqui{'\n'}
                    2. Aparece um pedido M-Pesa no telemóvel{'\n'}
                    3. Introduz o PIN M-Pesa{'\n'}
                    4. Saldo é creditado após confirmação
                  </Text>
                </View>
              </View>

              <View style={styles.limits}>
                <Text style={styles.limitsTitle}>Limite de depósito</Text>
                <Text style={styles.limitsText}>Mínimo: 10 MT</Text>
                <Text style={styles.limitsText}>Máximo: 5.000.000 MT</Text>
              </View>
            </>
          )}

          {/* Step 2: Confirm */}
          {step === 'confirm' && (
            <>
              <View style={styles.confirmBox}>
                <View style={styles.confirmIconWrap}>
                  <Ionicons name="wallet" size={48} color={FretixColors.yellow} />
                </View>
                <Text style={styles.confirmTitle}>Confirmar Depósito</Text>
                <Text style={styles.confirmMessage}>
                  Revise os dados antes de confirmar
                </Text>

                <View style={styles.confirmDetails}>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Valor</Text>
                    <Text style={styles.confirmValue}>
                      {formattedAmount.toLocaleString('pt-MZ')} MT
                    </Text>
                  </View>
                  <View style={styles.confirmDivider} />
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Telemóvel</Text>
                    <Text style={styles.confirmValue}>{phone}</Text>
                  </View>
                </View>

                <View style={styles.warningBox}>
                  <Ionicons name="alert-circle-outline" size={16} color={FretixColors.yellow} />
                  <Text style={styles.warningText}>
                    Após confirmar, deve aparecer um diálogo de PIN M-Pesa no telemóvel {phone}
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* Step 3: Processing */}
          {step === 'processing' && (
            <View style={styles.processingBox}>
              <ActivityIndicator size="large" color={FretixColors.yellow} />
              <Text style={styles.processingText}>A contactar Vodacom M-Pesa...</Text>
              <Text style={styles.processingSubtext}>Aguarde — o pedido de PIN será enviado ao telemóvel</Text>
            </View>
          )}

          {/* Step 4: Waiting for PIN */}
          {step === 'waiting_pin' && depositResponse && (
            <>
              <View style={styles.waitingBox}>
                <View style={styles.pulsingCircle}>
                  <Ionicons name="phone-portrait" size={40} color={FretixColors.yellow} />
                </View>

                <Text style={styles.waitingTitle}>Confirme o PIN no Telemóvel</Text>
                <Text style={styles.waitingSubtitle}>
                  {depositResponse.message || 'Pedido enviado à Vodacom. Introduza o PIN M-Pesa no telemóvel.'}
                </Text>
                
                <View style={styles.timerBox}>
                  <Text style={styles.timerLabel}>Tempo restante</Text>
                  <Text style={styles.timerValue}>{formatTime(timeRemaining)}</Text>
                </View>

                <View style={styles.stepsList}>
                  <View style={styles.stepItem}>
                    <View style={[styles.stepNumber, { backgroundColor: '#22C55E' }]}>
                      <Ionicons name="checkmark" size={16} color="#101217" />
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Pedido M-Pesa enviado</Text>
                      <Text style={styles.stepDesc}>Vodacom aceitou o pedido ({depositResponse.amount} MT)</Text>
                    </View>
                  </View>

                  <View style={styles.stepConnector} />

                  <View style={styles.stepItem}>
                    <View style={[styles.stepNumber, { backgroundColor: FretixColors.yellow }]}>
                      <Ionicons name="phone-portrait" size={16} color="#101217" />
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Diálogo de PIN</Text>
                      <Text style={styles.stepDesc}>Deve aparecer no telemóvel {depositResponse.phone}</Text>
                    </View>
                  </View>

                  <View style={styles.stepConnector} />

                  <View style={styles.stepItem}>
                    <View style={[styles.stepNumber, { backgroundColor: '#9CA3AF' }]}>
                      <Ionicons name="key" size={16} color="#101217" />
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Introduzir PIN</Text>
                      <Text style={styles.stepDesc}>Confirme o pagamento na app M-Pesa</Text>
                    </View>
                  </View>

                  <View style={styles.stepConnector} />

                  <View style={styles.stepItem}>
                    <View style={[styles.stepNumber, { backgroundColor: '#9CA3AF' }]}>
                      <Ionicons name="checkmark-circle" size={16} color="#101217" />
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Creditado!</Text>
                      <Text style={styles.stepDesc}>Saldo atualizado automaticamente</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.infoBox}>
                  <Ionicons name="information-circle-outline" size={18} color={FretixColors.yellow} />
                  <View style={styles.infoText}>
                    <Text style={styles.infoTitle}>A aguardar confirmação</Text>
                    <Text style={styles.infoDesc}>
                      O saldo só é creditado depois de introduzir o PIN no telemóvel. Tem até 1 minuto.
                    </Text>
                  </View>
                </View>

                <Text style={styles.pollingStatus}>
                  Verificando... (tentativa {pollingCount})
                </Text>
              </View>
            </>
          )}

          {/* Step 5: Success */}
          {step === 'success' && depositResponse && (
            <>
              <View style={styles.successBox}>
                <View style={styles.successIconWrap}>
                  <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
                </View>
                <Text style={styles.successTitle}>Depósito Confirmado!</Text>
                <Text style={styles.successMessage}>
                  Seu saldo foi creditado com sucesso
                </Text>

                <View style={styles.confirmDetails}>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Valor creditado</Text>
                    <Text style={[styles.confirmValue, { color: '#22C55E' }]}>
                      +{depositResponse.amount.toLocaleString('pt-MZ')} MT
                    </Text>
                  </View>
                  <View style={styles.confirmDivider} />
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Referência</Text>
                    <Text style={styles.confirmValue}>{depositResponse.external_reference}</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Step 6: Error */}
          {step === 'error' && (
            <View style={styles.errorBox}>
              <Ionicons name="close-circle" size={64} color="#EF4444" />
              <Text style={styles.errorTitle}>Erro no Depósito</Text>
              <Text style={styles.errorMessage}>
                {depositResponse?.message || 'Ocorreu um erro ao processar o depósito.'}
              </Text>
              <Text style={styles.errorHint}>
                Verifique os dados e tente novamente.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step === 'input' && (
            <>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={isLoading}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.depositButton, !isValid && styles.disabledButton]}
                onPress={() => setStep('confirm')}
                disabled={!isValid || isLoading}>
                <Text style={styles.depositButtonText}>Próximo</Text>
              </Pressable>
            </>
          )}

          {step === 'confirm' && (
            <>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={() => setStep('input')}
                disabled={isLoading}>
                <Text style={styles.cancelButtonText}>Voltar</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.depositButton]}
                onPress={handleDeposit}
                disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator color="#101217" />
                ) : (
                  <Text style={styles.depositButtonText}>Confirmar</Text>
                )}
              </Pressable>
            </>
          )}

          {step === 'waiting_pin' && (
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Fechar</Text>
            </Pressable>
          )}

          {step === 'success' && (
            <Pressable
              style={[styles.button, styles.depositButton]}
              onPress={handleClose}>
              <Text style={styles.depositButtonText}>Pronto</Text>
            </Pressable>
          )}

          {step === 'error' && (
            <>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}>
                <Text style={styles.cancelButtonText}>Fechar</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.depositButton]}
                onPress={() => setStep('input')}>
                <Text style={styles.depositButtonText}>Tentar Novamente</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FretixColors.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#273444',
  },
  title: {
    color: FretixColors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 120,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: FretixColors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  currencyLabel: {
    color: FretixColors.yellow,
    fontSize: 16,
    fontWeight: '700',
  },
  amountInput: {
    flex: 1,
    paddingVertical: 14,
    color: FretixColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  phoneInput: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    color: FretixColors.white,
    fontSize: 16,
  },
  phoneHint: {
    color: '#6B7280',
    fontSize: 12,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    padding: 12,
  },
  infoText: {
    flex: 1,
    gap: 4,
  },
  infoTitle: {
    color: FretixColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  infoDesc: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  limits: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  limitsTitle: {
    color: FretixColors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  limitsText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  confirmBox: {
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 16,
    padding: 24,
  },
  confirmTitle: {
    color: FretixColors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  confirmMessage: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
  confirmDetails: {
    width: '100%',
    backgroundColor: '#0F1419',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmLabel: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  confirmValue: {
    color: FretixColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: FretixColors.black,
    borderTopWidth: 1,
    borderTopColor: '#273444',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
  },
  cancelButtonText: {
    color: FretixColors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  depositButton: {
    backgroundColor: FretixColors.yellow,
  },
  depositButtonText: {
    color: '#101217',
    fontSize: 15,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
  },
  // Warning, Processing, Waiting, Success, Error Boxes
  warningBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    borderWidth: 1,
    borderColor: FretixColors.yellow,
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    color: FretixColors.white,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  processingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 40,
  },
  processingText: {
    color: FretixColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  processingSubtext: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  waitingBox: {
    alignItems: 'center',
    gap: 24,
  },
  pulsingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: FretixColors.yellow,
  },
  waitingTitle: {
    color: FretixColors.white,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  waitingSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  timerBox: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  timerLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  timerValue: {
    color: FretixColors.yellow,
    fontSize: 28,
    fontWeight: '700',
  },
  stepsList: {
    width: '100%',
    gap: 0,
  },
  stepItem: {
    flexDirection: 'row',
    gap: 16,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: {
    flex: 1,
    paddingVertical: 8,
  },
  stepTitle: {
    color: FretixColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  stepDesc: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  stepConnector: {
    width: 2,
    height: 16,
    backgroundColor: '#374151',
    marginLeft: 19,
  },
  pollingStatus: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
  confirmIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDivider: {
    height: 1,
    backgroundColor: '#374151',
  },
  successBox: {
    alignItems: 'center',
    gap: 16,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    color: '#22C55E',
    fontSize: 20,
    fontWeight: '700',
  },
  successMessage: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
  errorBox: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 40,
  },
  errorTitle: {
    color: '#EF4444',
    fontSize: 20,
    fontWeight: '700',
  },
  errorMessage: {
    color: FretixColors.white,
    fontSize: 14,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  errorHint: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
});
