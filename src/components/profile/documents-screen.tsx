import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlowScreenHeader } from '@/components/wallet/flow-screen-header';
import { withAlpha } from '@/components/wallet/utils';
import { FretixColors } from '@/constants/theme';

type DocumentId = 'id-front' | 'id-back' | 'id-holding';

type DocumentItem = {
  id: DocumentId;
  title: string;
  description: string;
  preview?: 'placeholder' | 'selfie';
  sentAt?: string;
  previewImage?: string;
};

const documentItems: DocumentItem[] = [
  {
    id: 'id-front',
    title: 'Foto do BI (frente)',
    description: 'Envie uma foto nitida da frente do seu documento.',
    preview: 'placeholder',
  },
  {
    id: 'id-back',
    title: 'Foto do BI (verso)',
    description: 'Envie uma foto nitida do verso do seu documento.',
    preview: 'placeholder',
  },
  {
    id: 'id-holding',
    title: 'Foto segurando o BI',
    description: 'Tire uma foto segurando seu documento ao lado do rosto.',
    preview: 'selfie',
    sentAt: '12/05/2024 as 10:30',
  },
];

const tips = [
  'Certifique-se de que as fotos estao nitidas e bem iluminadas.',
  'O documento deve aparecer completo, sem cortes.',
  'Todas as informacoes devem estar legiveis.',
  'Na selfie, rosto e documento devem estar visiveis.',
];

type VerificationPhase = 'upload' | 'pending';

/** Documents — identity verification upload and status (Figma). */
export function DocumentsScreen() {
  const [phase, setPhase] = useState<VerificationPhase>('upload');
  const [captured, setCaptured] = useState<Record<DocumentId, boolean>>({
    'id-front': false,
    'id-back': false,
    'id-holding': false,
  });

  const allCaptured = useMemo(() => Object.values(captured).every(Boolean), [captured]);
  const isPending = phase === 'pending';

  const handleCapture = (id: DocumentId) => {
    if (isPending) return;
    setCaptured((prev) => ({ ...prev, [id]: true }));
  };

  const handleSubmit = () => {
    if (!allCaptured || isPending) return;
    setPhase('pending');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <FlowScreenHeader title="Documentos" />

          {isPending ? (
            <View style={styles.alertBlue}>
              <View style={styles.alertIconBlue}>
                <Ionicons name="sync" size={20} color="#60A5FA" />
              </View>
              <View style={styles.alertText}>
                <Text style={styles.alertTitle}>Verificando sua conta</Text>
                <Text style={styles.alertSubtitle}>
                  Recebemos seus documentos e estamos analisando. Isso pode levar ate 24 horas uteis.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.alertRed}>
              <View style={styles.alertIconRed}>
                <Ionicons name="shield-outline" size={20} color="#F87171" />
              </View>
              <View style={styles.alertText}>
                <Text style={styles.alertTitle}>Conta nao verificada</Text>
                <Text style={styles.alertSubtitle}>
                  Para ter acesso completo a plataforma, envie os seus documentos para verificacao.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {isPending ? 'Seus documentos' : 'Documentos necessarios'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {isPending
                ? 'Acompanhe o status dos documentos enviados.'
                : 'Para sua seguranca e dos nossos clientes, precisamos verificar sua identidade.'}
            </Text>
          </View>

          {documentItems.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              isPending={isPending}
              isCaptured={captured[doc.id]}
              onCapture={() => handleCapture(doc.id)}
            />
          ))}

          {isPending ? (
            <View style={styles.infoBoxBlue}>
              <View style={styles.infoIconBlue}>
                <Ionicons name="time-outline" size={20} color="#60A5FA" />
              </View>
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>O que acontece agora?</Text>
                <Text style={styles.infoSubtitle}>
                  Nossa equipe esta analisando seus documentos. Voce sera notificado pelo aplicativo assim
                  que a verificacao for concluida.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.tipsBox}>
              <View style={styles.tipsHeader}>
                <Ionicons name="information-circle" size={20} color={FretixColors.yellow} />
                <Text style={styles.tipsTitle}>Dicas importantes</Text>
              </View>
              {tips.map((tip) => (
                <View key={tip} style={styles.tipRow}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}

          <Pressable
            style={[
              styles.submitButton,
              (isPending || !allCaptured) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isPending || !allCaptured}
            accessibilityRole="button">
            <Text style={[styles.submitButtonText, isPending && styles.submitButtonTextMuted]}>
              {isPending ? 'Aguardando verificacao...' : 'Enviar documentos'}
            </Text>
          </Pressable>

          <View style={styles.footer}>
            <Ionicons name="lock-closed" size={14} color={FretixColors.grayLight} />
            <Text style={styles.footerText}>Suas informacoes estao protegidas e seguras.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function DocumentCard({
  doc,
  isPending,
  isCaptured,
  onCapture,
}: {
  doc: DocumentItem;
  isPending: boolean;
  isCaptured: boolean;
  onCapture: () => void;
}) {
  const showUploaded = isPending || isCaptured;

  return (
    <View style={styles.documentCard}>
      <View style={styles.documentMain}>
        <View style={styles.previewWrap}>
          {showUploaded && doc.previewImage ? (
            <Image source={{ uri: doc.previewImage }} style={styles.previewImage} />
          ) : showUploaded && doc.preview === 'selfie' ? (
            <View style={styles.previewUploaded}>
              <Ionicons name="person" size={28} color={FretixColors.grayLight} />
            </View>
          ) : showUploaded ? (
            <View style={styles.previewUploaded}>
              <Ionicons name="card" size={28} color={FretixColors.grayLight} />
            </View>
          ) : (
            <View style={styles.previewPlaceholder}>
              <Ionicons name="image-outline" size={28} color="#4B5563" />
            </View>
          )}
        </View>

        <View style={styles.documentText}>
          <Text style={styles.documentTitle}>{doc.title}</Text>
          <Text style={styles.documentDescription}>{doc.description}</Text>
          {showUploaded && (
            <Text style={styles.sentAt}>
              Enviado em {doc.sentAt ?? '28/05/2026 as 14:15'}
            </Text>
          )}
          {showUploaded && (
            <View style={styles.sentBadge}>
              <Text style={styles.sentBadgeText}>Enviado</Text>
            </View>
          )}
        </View>
      </View>

      {showUploaded ? (
        <View style={styles.statusCheck}>
          <Ionicons name="checkmark-circle" size={28} color="#22C55E" />
        </View>
      ) : (
        <Pressable style={styles.takePhotoButton} onPress={onCapture} accessibilityRole="button">
          <Ionicons name="camera" size={18} color={FretixColors.yellow} />
          <Text style={styles.takePhotoText}>Tirar foto</Text>
        </Pressable>
      )}
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
    paddingBottom: 28,
    gap: 14,
  },
  alertRed: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#2A1215',
    borderWidth: 1,
    borderColor: '#7F1D1D',
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  alertBlue: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#0F1A2E',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  alertIconRed: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: withAlpha('#EF4444', 0.2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIconBlue: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: withAlpha('#3B82F6', 0.2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertText: {
    flex: 1,
    gap: 4,
  },
  alertTitle: {
    color: FretixColors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  alertSubtitle: {
    color: FretixColors.grayLight,
    fontSize: 12,
    lineHeight: 17,
  },
  sectionHeader: {
    gap: 4,
    marginTop: 4,
  },
  sectionTitle: {
    color: FretixColors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: FretixColors.grayLight,
    fontSize: 12,
    lineHeight: 17,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    padding: 12,
  },
  documentMain: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  previewWrap: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1A1F26',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1F26',
    width: '100%',
    height: '100%',
  },
  previewUploaded: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
    width: '100%',
    height: '100%',
  },
  documentText: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  documentTitle: {
    color: FretixColors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  documentDescription: {
    color: FretixColors.grayLight,
    fontSize: 11,
    lineHeight: 15,
  },
  sentAt: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 2,
  },
  sentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: withAlpha('#22C55E', 0.16),
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  sentBadgeText: {
    color: '#86EFAC',
    fontSize: 10,
    fontWeight: '700',
  },
  takePhotoButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: FretixColors.yellow,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minWidth: 72,
  },
  takePhotoText: {
    color: FretixColors.yellow,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusCheck: {
    paddingHorizontal: 4,
  },
  tipsBox: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: FretixColors.yellow,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipsTitle: {
    color: FretixColors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  tipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 4,
  },
  tipBullet: {
    color: FretixColors.grayLight,
    fontSize: 12,
    lineHeight: 17,
  },
  tipText: {
    flex: 1,
    color: FretixColors.grayLight,
    fontSize: 12,
    lineHeight: 17,
  },
  infoBoxBlue: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#0F1A2E',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    borderRadius: 14,
    padding: 14,
  },
  infoIconBlue: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: withAlpha('#3B82F6', 0.2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    gap: 4,
  },
  infoTitle: {
    color: FretixColors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  infoSubtitle: {
    color: FretixColors.grayLight,
    fontSize: 12,
    lineHeight: 17,
  },
  submitButton: {
    backgroundColor: FretixColors.yellow,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#374151',
  },
  submitButtonText: {
    color: '#101217',
    fontSize: 15,
    fontWeight: '700',
  },
  submitButtonTextMuted: {
    color: '#9CA3AF',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  footerText: {
    color: FretixColors.grayLight,
    fontSize: 11,
  },
});
