import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useParkingSession } from '../../hooks/useParkingSession';
import { MOCK_USER } from '../../constants/mockData';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/colors';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { history } = useParkingSession();

  const totalSpent = history
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + s.totalCost, 0);
  const totalSessions = history.filter((s) => s.status === 'completed').length;

  const initials = `${MOCK_USER.firstName[0]}${MOCK_USER.lastName[0]}`.toUpperCase();

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <TouchableOpacity style={styles.editBtn}>
          <Ionicons name="pencil" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.name}>
          {MOCK_USER.firstName} {MOCK_USER.lastName}
        </Text>
        <Text style={styles.email}>{MOCK_USER.email}</Text>
      </View>

      <View style={styles.stats}>
        <View style={[styles.statCard, styles.statCardAccent]}>
          <Ionicons name="car" size={24} color={Colors.textOnAccent} />
          <Text style={styles.statValue}>{totalSessions}</Text>
          <Text style={styles.statLabel}>Parcheggi</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="wallet" size={24} color={Colors.primary} />
          <Text style={[styles.statValue, { color: Colors.primary }]}>
            {'\u20AC'}{totalSpent.toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>Totale speso</Text>
        </View>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="card-outline" size={22} color={Colors.text} />
          <Text style={styles.menuLabel}>Metodi di pagamento</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="car-outline" size={22} color={Colors.text} />
          <Text style={styles.menuLabel}>I miei veicoli</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="document-text-outline" size={22} color={Colors.text} />
          <Text style={styles.menuLabel}>Ricevute e fatture</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="help-circle-outline" size={22} color={Colors.text} />
          <Text style={styles.menuLabel}>Aiuto</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
  },
  editBtn: {
    position: 'absolute',
    top: 0,
    right: Spacing.xl,
    padding: Spacing.sm,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  email: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.card,
  },
  statCardAccent: {
    backgroundColor: Colors.accent,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textOnAccent,
    marginTop: Spacing.sm,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  menu: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separator,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
});
