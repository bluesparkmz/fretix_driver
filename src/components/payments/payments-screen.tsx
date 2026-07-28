import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlowScreenHeader } from '@/components/wallet/flow-screen-header';
import { withAlpha } from '@/components/wallet/utils';
import { FretixColors } from '@/constants/theme';

const financialSummary = [
  {
    label: 'Ganhos em aberto',
    value: '12.500,00 MT',
    meta: '3 cargas',
    icon: 'time' as const,
    iconColor: FretixColors.yellow,
  },
  {
    label: 'Ganhos pagos',
    value: '32.750,00 MT',
    meta: '15 cargas',
    icon: 'checkmark-circle' as const,
    iconColor: '#22C55E',
  },
  {
    label: 'Total de ganhos',
    value: '45.250,00 MT',
    meta: '18 cargas',
    icon: 'information-circle' as const,
    iconColor: '#3B82F6',
  },
];

const receivingMethods = [
  {
    icon: 'business' as const,
    title: 'Conta bancaria',
    subtitle: 'Millennium bim',
    detail: '**** 4521',
    isDefault: true,
  },
  {
    icon: 'phone-portrait' as const,
    title: 'Carteira movel',
    subtitle: 'mKesh',
    detail: '+258 84 *** 4567',
    isDefault: false,
  },
];

const howItWorksSteps = [
  {
    icon: 'cube' as const,
    color: FretixColors.yellow,
    title: 'Realize uma carga',
    description: 'Aceite e execute cargas publicadas na plataforma.',
  },
  {
    icon: 'checkmark-circle' as const,
    color: '#22C55E',
    title: 'Carga concluida',
    description: 'Apos confirmacao da entrega, o pagamento entra no seu saldo.',
  },
  {
    icon: 'arrow-up-circle' as const,
    color: '#3B82F6',
    title: 'Saque para sua conta',
    description: 'Transfira o valor para conta bancaria ou carteira movel cadastrada.',
  },
];

/** Payments — receiving methods, financial summary, withdrawals overview (Figma). */
export function PaymentsScreen() {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const balanceText = balanceVisible ? '45.250,00 MT' : '••••••••';

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <FlowScreenHeader title="Pagamentos" />

          <View style={styles.balanceSection}>
            <View style={styles.balanceMain}>
              <View style={styles.balanceLabelRow}>
                <Text style={styles.balanceLabel}>Saldo disponivel</Text>
                <Pressable
                  onPress={() => setBalanceVisible((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={balanceVisible ? 'Ocultar saldo' : 'Mostrar saldo'}>
                  <Ionicons
                    name={balanceVisible ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color={FretixColors.grayLight}
                  />
                </Pressable>
              </View>
              <Text style={styles.balanceValue}>{balanceText}</Text>
              <View style={styles.availableBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#22C55E" />
                <Text style={styles.availableBadgeText}>Disponivel para saques</Text>
              </View>
            </View>
            <View style={styles.walletIllustration}>
              <View style={styles.walletBody}>
                <View style={styles.walletCard} />
              </View>
              <Ionicons
                name="wallet"
                size={36}
                color={withAlpha(FretixColors.yellow, 0.35)}
                style={styles.walletIcon}
              />
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable style={styles.primaryButton} accessibilityRole="button">
              <Ionicons name="arrow-up" size={18} color="#101217" />
              <Text style={styles.primaryButtonText}>Sacar</Text>
            </Pressable>
            <Pressable style={styles.outlineButton} accessibilityRole="button">
              <Ionicons name="download-outline" size={18} color={FretixColors.yellow} />
              <Text style={styles.outlineButtonText}>Historico</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Resumo financeiro</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.summaryScroll}>
            {financialSummary.map((item) => (
              <View key={item.label} style={styles.summaryCard}>
                <View style={[styles.summaryIconWrap, { backgroundColor: withAlpha(item.iconColor, 0.16) }]}>
                  <Ionicons name={item.icon} size={16} color={item.iconColor} />
                </View>
                <Text style={styles.summaryLabel}>{item.label}</Text>
                <Text style={styles.summaryValue}>{item.value}</Text>
                <Text style={styles.summaryMeta}>{item.meta}</Text>
              </View>
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>Metodos de recebimento</Text>
          <View style={styles.methodsCard}>
            {receivingMethods.map((method, index) => (
              <Pressable
                key={method.title}
                style={[styles.methodRow, index < receivingMethods.length - 1 && styles.methodRowBorder]}
                accessibilityRole="button">
                <View style={styles.methodIconWrap}>
                  <Ionicons name={method.icon} size={20} color={FretixColors.yellow} />
                </View>
                <View style={styles.methodText}>
                  <Text style={styles.methodTitle}>{method.title}</Text>
                  <Text style={styles.methodSubtitle}>
                    {method.subtitle} · {method.detail}
                  </Text>
                </View>
                <View style={styles.methodTrailing}>
                  {method.isDefault ? (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Padrao</Text>
                    </View>
                  ) : (
                    <Pressable style={styles.setDefaultButton} accessibilityRole="button">
                      <Text style={styles.setDefaultText}>Definir como padrao</Text>
                    </Pressable>
                  )}
                  <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                </View>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Como funciona?</Text>
          <View style={styles.stepsCard}>
            {howItWorksSteps.map((step, index) => (
              <View key={step.title} style={styles.stepRow}>
                <View style={styles.stepTimeline}>
                  <View style={[styles.stepIconWrap, { backgroundColor: withAlpha(step.color, 0.16) }]}>
                    <Ionicons name={step.icon} size={18} color={step.color} />
                  </View>
                  {index < howItWorksSteps.length - 1 && <View style={styles.stepLine} />}
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            ))}
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
    gap: 18,
  },
  balanceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  balanceMain: {
    flex: 1,
    gap: 6,
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceLabel: {
    color: FretixColors.grayLight,
    fontSize: 13,
  },
  balanceValue: {
    color: FretixColors.white,
    fontSize: 28,
    fontWeight: '700',
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: withAlpha('#22C55E', 0.12),
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  availableBadgeText: {
    color: '#86EFAC',
    fontSize: 11,
    fontWeight: '600',
  },
  walletIllustration: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletBody: {
    width: 72,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    padding: 8,
    justifyContent: 'flex-end',
  },
  walletCard: {
    height: 14,
    borderRadius: 4,
    backgroundColor: FretixColors.yellow,
  },
  walletIcon: {
    position: 'absolute',
    top: 8,
    right: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: FretixColors.yellow,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#101217',
    fontSize: 15,
    fontWeight: '700',
  },
  outlineButton: {
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
  outlineButtonText: {
    color: FretixColors.yellow,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    color: FretixColors.white,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 4,
  },
  summaryScroll: {
    gap: 10,
    paddingRight: 4,
  },
  summaryCard: {
    width: 148,
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  summaryIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    color: FretixColors.grayLight,
    fontSize: 11,
    lineHeight: 15,
  },
  summaryValue: {
    color: FretixColors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  summaryMeta: {
    color: '#6B7280',
    fontSize: 11,
  },
  methodsCard: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    overflow: 'hidden',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  methodRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#273444',
  },
  methodIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: withAlpha(FretixColors.yellow, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  methodTitle: {
    color: FretixColors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  methodSubtitle: {
    color: FretixColors.grayLight,
    fontSize: 11,
  },
  methodTrailing: {
    alignItems: 'flex-end',
    gap: 6,
  },
  defaultBadge: {
    backgroundColor: withAlpha('#22C55E', 0.16),
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  defaultBadgeText: {
    color: '#86EFAC',
    fontSize: 10,
    fontWeight: '700',
  },
  setDefaultButton: {
    borderWidth: 1,
    borderColor: FretixColors.yellow,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  setDefaultText: {
    color: FretixColors.yellow,
    fontSize: 9,
    fontWeight: '700',
  },
  stepsCard: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stepTimeline: {
    alignItems: 'center',
    width: 36,
  },
  stepIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#273444',
    marginVertical: 4,
    minHeight: 24,
  },
  stepContent: {
    flex: 1,
    paddingBottom: 16,
    gap: 4,
  },
  stepTitle: {
    color: FretixColors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  stepDescription: {
    color: FretixColors.grayLight,
    fontSize: 12,
    lineHeight: 17,
  },
});
