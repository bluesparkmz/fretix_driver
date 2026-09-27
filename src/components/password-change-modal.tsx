import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FretixColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/utils/api-error';
import { getPasswordSecurityMessage } from '@/utils/password-validation';

type Props = {
  visible: boolean;
  mandatory?: boolean;
  onClose?: () => void;
};

type Stage = 'intro' | 'form' | 'success';

export function PasswordChangeModal({ visible, mandatory = false, onClose }: Props) {
  const { changeInitialPassword, changePassword } = useAuth();
  const [stage, setStage] = useState<Stage>(mandatory ? 'intro' : 'form');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setStage(mandatory ? 'intro' : 'form');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  }, [mandatory, visible]);

  const close = () => {
    if (mandatory && stage !== 'success') return;
    setStage(mandatory ? 'intro' : 'form');
    onClose?.();
  };

  const save = async () => {
    setError('');
    if (!mandatory && !currentPassword) {
      setError('Digite a senha atual.');
      return;
    }
    const securityMessage = getPasswordSecurityMessage(newPassword);
    if (securityMessage) {
      setError(securityMessage);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('A nova senha e a confirmação devem ser iguais.');
      return;
    }

    try {
      setSaving(true);
      if (mandatory) {
        await changeInitialPassword(newPassword);
      } else {
        await changePassword(currentPassword, newPassword);
      }
      setStage('success');
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'Não foi possível alterar a senha. Verifique os dados e tente novamente.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const isVisible = visible || stage === 'success';

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          {stage === 'intro' ? (
            <>
              <View style={styles.iconWrap}>
                <Ionicons name="shield-checkmark" size={38} color={FretixColors.yellow} />
              </View>
              <Text style={styles.title}>Proteja a sua conta</Text>
              <Text style={styles.message}>
                Está a usar a senha temporária criada no seu cadastro. Antes de continuar,
                crie uma senha pessoal que apenas você conhece.
              </Text>
              <View style={styles.notice}>
                <Ionicons name="lock-closed-outline" size={18} color="#93C5FD" />
                <Text style={styles.noticeText}>
                  A nova senha deve ter pelo menos 6 caracteres, uma letra e um número.
                </Text>
              </View>
              <Pressable style={styles.primaryButton} onPress={() => setStage('form')}>
                <Text style={styles.primaryButtonText}>Trocar a minha senha</Text>
                <Ionicons name="arrow-forward" size={19} color="#101217" />
              </Pressable>
            </>
          ) : stage === 'success' ? (
            <>
              <View style={[styles.iconWrap, styles.successIcon]}>
                <Ionicons name="checkmark" size={42} color="#22C55E" />
              </View>
              <Text style={styles.title}>Senha alterada</Text>
              <Text style={styles.message}>
                A sua nova senha foi guardada com sucesso. Utilize-a no próximo acesso.
              </Text>
              <Pressable style={styles.primaryButton} onPress={close}>
                <Text style={styles.primaryButtonText}>Continuar</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.formHeader}>
                <View>
                  <Text style={styles.eyebrow}>SEGURANÇA</Text>
                  <Text style={styles.formTitle}>Criar nova senha</Text>
                </View>
                {!mandatory ? (
                  <Pressable style={styles.closeButton} onPress={close} hitSlop={10}>
                    <Ionicons name="close" size={22} color={FretixColors.white} />
                  </Pressable>
                ) : null}
              </View>

              {!mandatory ? (
                <PasswordInput
                  label="Senha atual"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  visible={showCurrent}
                  onToggle={() => setShowCurrent((value) => !value)}
                />
              ) : null}
              <PasswordInput
                label="Nova senha"
                value={newPassword}
                onChangeText={setNewPassword}
                visible={showNew}
                onToggle={() => setShowNew((value) => !value)}
              />
              <PasswordInput
                label="Confirmar nova senha"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                visible={showConfirm}
                onToggle={() => setShowConfirm((value) => !value)}
              />

              <View style={styles.rules}>
                <Rule ok={newPassword.length >= 6} text="Pelo menos 6 caracteres" />
                <Rule ok={/[A-Za-zÀ-ÿ]/.test(newPassword)} text="Pelo menos uma letra" />
                <Rule ok={/\d/.test(newPassword)} text="Pelo menos um número" />
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color="#FCA5A5" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                style={[styles.primaryButton, saving && styles.disabledButton]}
                onPress={save}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#101217" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={19} color="#101217" />
                    <Text style={styles.primaryButtonText}>Guardar nova senha</Text>
                  </>
                )}
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PasswordInput({
  label,
  value,
  onChangeText,
  visible,
  onToggle,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="lock-closed-outline" size={18} color="#7C8797" />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="••••••••"
          placeholderTextColor="#5D6673"
        />
        <Pressable onPress={onToggle} hitSlop={10}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#8D949E" />
        </Pressable>
      </View>
    </View>
  );
}

function Rule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={styles.ruleRow}>
      <Ionicons
        name={ok ? 'checkmark-circle' : 'ellipse-outline'}
        size={15}
        color={ok ? '#22C55E' : '#657081'}
      />
      <Text style={[styles.ruleText, ok && styles.ruleTextOk]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(3, 7, 12, 0.88)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#303B4A',
    backgroundColor: '#111823',
    padding: 22,
    gap: 15,
  },
  iconWrap: {
    width: 72,
    height: 72,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
    backgroundColor: 'rgba(255, 193, 7, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.35)',
  },
  successIcon: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(34, 197, 94, 0.35)',
  },
  title: { color: '#FFFFFF', fontSize: 23, fontWeight: '900', textAlign: 'center' },
  message: { color: '#B8C1CC', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  notice: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.09)',
  },
  noticeText: { flex: 1, color: '#CBD5E1', fontSize: 12, lineHeight: 18 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: FretixColors.yellow, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  formTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginTop: 3 },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#202A37',
  },
  field: { gap: 7 },
  label: { color: '#D7DEE8', fontSize: 12, fontWeight: '700' },
  inputWrap: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0B111A',
  },
  input: { flex: 1, color: '#FFFFFF', fontSize: 15 },
  rules: { gap: 6, paddingHorizontal: 2 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  ruleText: { color: '#7C8797', fontSize: 11 },
  ruleTextOk: { color: '#A7F3D0' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    padding: 11,
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
  },
  errorText: { flex: 1, color: '#FCA5A5', fontSize: 12, lineHeight: 17 },
  primaryButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 15,
    backgroundColor: FretixColors.yellow,
    paddingHorizontal: 16,
  },
  primaryButtonText: { color: '#101217', fontSize: 15, fontWeight: '900' },
  disabledButton: { opacity: 0.65 },
});
