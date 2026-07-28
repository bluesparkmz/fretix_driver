import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';

import { withAlpha } from '@/components/wallet/utils';
import { FretixColors } from '@/constants/theme';

export type ProposalCardData = {
  id: string;
  driverName: string;
  rating: number;
  reviewCount: number;
  amount: string;
  deliveryBy: string;
  durationBadge: string;
  avatar?: ImageSourcePropType | string;
};

type ProposalCardProps = {
  proposal: ProposalCardData;
  onPress?: () => void;
  onAccept?: () => void;
  onNegotiate?: () => void;
  showActions?: boolean;
};

export function ProposalCard({
  proposal,
  onPress,
  onAccept,
  onNegotiate,
  showActions,
}: ProposalCardProps) {
  const avatarSource =
    typeof proposal.avatar === 'string' && proposal.avatar.trim().length > 0
      ? { uri: proposal.avatar }
      : typeof proposal.avatar === 'object' && proposal.avatar !== null
        ? proposal.avatar
        : null;

  const content = (
    <>
      {avatarSource ? (
        <Image source={avatarSource} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Ionicons name="business" size={24} color={FretixColors.yellow} />
        </View>
      )}
      <View style={styles.main}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{proposal.driverName}</Text>
          <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
        </View>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color={FretixColors.yellow} />
          <Text style={styles.rating}>
            {proposal.rating} ({proposal.reviewCount} avaliacoes)
          </Text>
        </View>
        <Text style={styles.amount}>{proposal.amount}</Text>
        <Text style={styles.delivery}>Entrega ate {proposal.deliveryBy}</Text>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{proposal.durationBadge}</Text>
        </View>
      </View>
      {showActions && (
        <View style={styles.actions}>
          <Pressable style={styles.acceptButton} onPress={onAccept} accessibilityRole="button">
            <Text style={styles.acceptText}>Aceitar</Text>
          </Pressable>
          {onNegotiate ? (
            <Pressable
              style={styles.negotiateButton}
              onPress={onNegotiate}
              accessibilityRole="button">
              <Text style={styles.negotiateText}>Negociar</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </>
  );

  if (showActions) {
    return <View style={styles.card}>{content}</View>;
  }

  if (onPress) {
    return (
      <Pressable
        style={styles.card}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Proposta de ${proposal.driverName}`}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#111723',
    borderWidth: 1,
    borderColor: '#273444',
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#273444',
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#273444',
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    color: FretixColors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    color: FretixColors.grayLight,
    fontSize: 11,
  },
  amount: {
    color: FretixColors.white,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  delivery: {
    color: FretixColors.grayLight,
    fontSize: 12,
  },
  durationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: withAlpha('#3B82F6', 0.2),
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  durationText: {
    color: '#93C5FD',
    fontSize: 10,
    fontWeight: '700',
  },
  actions: {
    gap: 6,
    justifyContent: 'center',
    alignItems: 'stretch',
    minWidth: 88,
  },
  acceptButton: {
    backgroundColor: '#22C55E',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  acceptText: {
    color: '#101217',
    fontSize: 11,
    fontWeight: '700',
  },
  negotiateButton: {
    borderWidth: 1,
    borderColor: FretixColors.yellow,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  negotiateText: {
    color: FretixColors.yellow,
    fontSize: 11,
    fontWeight: '700',
  },
});
