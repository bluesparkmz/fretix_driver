import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlowScreenHeader } from '@/components/wallet/flow-screen-header';
import { withAlpha } from '@/components/wallet/utils';
import { FretixColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { UserAvatar } from '@/components/user-avatar';
import { getUserRoleLabel } from '@/utils/user-role';

type InfoRowData = {
  label: string;
  value?: string;
  valueColor?: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
};

type InfoSectionData = {
  title: string;
  rows: InfoRowData[];
};

const personalDataSection: InfoSectionData = {
  title: 'Dados pessoais',
  rows: [
    { label: 'Nome completo', value: 'Manuel Joao', icon: 'person-outline' },
    { label: 'Data de nascimento', value: '15 / 06 / 1990', icon: 'calendar-outline' },
    { label: 'Nacionalidade', value: 'Mocambicana', icon: 'flag-outline' },
    { label: 'Documento de identificacao', value: '110100123456A', icon: 'card-outline' },
    { label: 'Numero de identificacao fiscal (NIF)', value: '400123456', icon: 'document-text-outline' },
    { label: 'Estado civil', value: 'Solteiro', icon: 'heart-outline' },
  ],
};

const contactSection: InfoSectionData = {
  title: 'Contato',
  rows: [
    { label: 'Telefone', value: '+258 84 123 4567', icon: 'call-outline' },
    { label: 'E-mail', value: 'manuel.joao@email.com', icon: 'mail-outline' },
    {
      label: 'Endereco',
      value: 'Av. Julius Nyerere, 1234, Maputo, Mocambique',
      icon: 'location-outline',
    },
  ],
};

const securitySection: InfoSectionData = {
  title: 'Seguranca',
  rows: [
    { label: 'Senha', value: '........', icon: 'lock-closed-outline' },
    {
      label: 'Autenticacao em dois fatores',
      value: 'Ativado',
      valueColor: '#22C55E',
      icon: 'shield-checkmark-outline',
    },
    { label: 'Dispositivos conectados', value: '2 dispositivos', icon: 'phone-portrait-outline' },
  ],
};

const preferencesSection: InfoSectionData = {
  title: 'Preferencias',
  rows: [{ label: 'Notificacoes', icon: 'notifications-outline' }],
};

function InfoSection({ section }: { section: InfoSectionData }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.sectionCard}>
        {section.rows.map((row, index) => (
          <InfoRow key={row.label} row={row} isLast={index === section.rows.length - 1} />
        ))}
      </View>
    </View>
  );
}

function InfoRow({ row, isLast }: { row: InfoRowData; isLast: boolean }) {
  const iconColor = row.iconColor ?? FretixColors.yellow;

  return (
    <Pressable
      style={[styles.infoRow, !isLast && styles.infoRowBorder]}
      accessibilityRole="button"
      accessibilityLabel={row.label}>
      <View style={[styles.infoIconWrap, { backgroundColor: withAlpha(iconColor, 0.14) }]}>
        <Ionicons name={row.icon} size={18} color={iconColor} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{row.label}</Text>
        {row.value ? (
          <Text style={[styles.infoValue, row.valueColor ? { color: row.valueColor } : null]} numberOfLines={2}>
            {row.value}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#6B7280" />
    </Pressable>
  );
}

/** Personal information — profile details and account settings (Figma). */
export function PersonalInformationScreen() {
  const { user } = useAuth();

  // Create dynamic sections based on real user data
  const personalDataSection: InfoSectionData = {
    title: 'Dados pessoais',
    rows: [
      { label: 'Nome completo', value: user?.name || 'Manuel Joao', icon: 'person-outline' },
      { label: 'Data de nascimento', value: '15 / 06 / 1990', icon: 'calendar-outline' },
      { label: 'Nacionalidade', value: 'Mocambicana', icon: 'flag-outline' },
      { label: 'Documento de identificacao', value: '110100123456A', icon: 'card-outline' },
      { label: 'Numero de identificacao fiscal (NIF)', value: '400123456', icon: 'document-text-outline' },
      { label: 'Estado civil', value: 'Solteiro', icon: 'heart-outline' },
    ],
  };

  const contactSection: InfoSectionData = {
    title: 'Contato',
    rows: [
      { label: 'Telefone', value: user?.phone || '+258 84 123 4567', icon: 'call-outline' },
      { label: 'E-mail', value: user?.email || 'manuel.joao@email.com', icon: 'mail-outline' },
      {
        label: 'Endereco',
        value: 'Av. Julius Nyerere, 1234, Maputo, Mocambique',
        icon: 'location-outline',
      },
    ],
  };

  const getRoleText = () => getUserRoleLabel(user);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <FlowScreenHeader title="Informacoes pessoais" />

          <View style={styles.profileCard}>
            <View style={styles.profileTop}>
              <View style={styles.avatarWrap}>
                <UserAvatar photo={user?.profile_photo} style={styles.avatar} />
                <Pressable style={styles.cameraButton} accessibilityRole="button" accessibilityLabel="Alterar foto">
                  <Ionicons name="camera" size={13} color="#101217" />
                </Pressable>
              </View>

              <View style={styles.profileMain}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>{user?.name || 'Manuel Joao'}</Text>
                  <Pressable style={styles.editButton} accessibilityRole="button">
                    <Ionicons name="create-outline" size={13} color={FretixColors.yellow} />
                    <Text style={styles.editButtonText}>Editar</Text>
                  </Pressable>
                </View>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={user?.verified ? '#22C55E' : '#FACC15'} />
                  <Text style={[styles.verifiedText, { color: user?.verified ? '#86EFAC' : '#FDE68A' }]}>
                    {user?.verified ? 'Verificado' : 'Nao verificado'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.quickContacts}>
              <View style={styles.quickContactRow}>
                <Ionicons name="call-outline" size={14} color={FretixColors.grayLight} />
                <Text style={styles.quickContactText}>{user?.phone || '+258 84 123 4567'}</Text>
              </View>
              <View style={styles.quickContactRow}>
                <Ionicons name="mail-outline" size={14} color={FretixColors.grayLight} />
                <Text style={styles.quickContactText}>{user?.email || 'manuel.joao@email.com'}</Text>
              </View>
              <View style={styles.quickContactRow}>
                <Ionicons name="location-outline" size={14} color={FretixColors.grayLight} />
                <Text style={styles.quickContactText}>Maputo, Mocambique</Text>
              </View>
            </View>
          </View>

          <InfoSection section={personalDataSection} />
          <InfoSection section={contactSection} />
          <InfoSection section={securitySection} />
          <InfoSection section={preferencesSection} />

          <Pressable style={styles.deleteButton} accessibilityRole="button">
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Excluir conta</Text>
          </Pressable>
          <Text style={styles.deleteWarning}>Atencao: esta acao nao pode ser desfeita.</Text>
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
    paddingBottom: 28,
    gap: 18,
  },
  profileCard: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    padding: 14,
    gap: 14,
    marginTop: 4,
  },
  profileTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#273444',
    backgroundColor: '#1A1F26',
  },
  cameraButton: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: FretixColors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#111723',
  },
  profileMain: {
    flex: 1,
    gap: 8,
    paddingTop: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  userName: {
    flex: 1,
    color: FretixColors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: FretixColors.yellow,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editButtonText: {
    color: FretixColors.yellow,
    fontSize: 11,
    fontWeight: '700',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: withAlpha('#22C55E', 0.12),
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verifiedText: {
    color: '#86EFAC',
    fontSize: 11,
    fontWeight: '600',
  },
  quickContacts: {
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#273444',
  },
  quickContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickContactText: {
    color: FretixColors.grayLight,
    fontSize: 12,
    flex: 1,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: FretixColors.grayLight,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginLeft: 2,
  },
  sectionCard: {
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#273444',
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  infoLabel: {
    color: FretixColors.grayLight,
    fontSize: 11,
  },
  infoValue: {
    color: FretixColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 14,
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteWarning: {
    color: '#F87171',
    fontSize: 11,
    textAlign: 'center',
    marginTop: -8,
  },
});
