import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useParkingSession } from '../../hooks/useParkingSession';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/colors';
import type { ParkingSession as ParkingSessionType } from '../../constants/types';

function formatDate(d: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (dDate.getTime() === today.getTime()) return 'Oggi';
  if (dDate.getTime() === yesterday.getTime()) return 'Ieri';
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function HistoryItem({ item }: { item: ParkingSessionType }) {
  const statusConfig = {
    completed: { label: 'Completato', color: Colors.success, icon: 'checkmark-circle' as const },
    expired: { label: 'Scaduto', color: Colors.warning, icon: 'time' as const },
    active: { label: 'Attivo', color: Colors.accent, icon: 'play-circle' as const },
  };
  const config = statusConfig[item.status];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.zoneName}>{item.zone.name}</Text>
        <View style={[styles.badge, { backgroundColor: `${config.color}20` }]}>
          <Ionicons name={config.icon} size={14} color={config.color} />
          <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>
      <Text style={styles.address}>{item.zone.orario}</Text>
      <View style={styles.meta}>
        <Text style={styles.metaText}>
          {formatTime(item.startTime)} – {formatTime(item.endTime)} · {item.durationMinutes} min
        </Text>
      </View>
      <Text style={styles.cost}>{'\u20AC'}{item.totalCost.toFixed(2)}</Text>
    </View>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { history } = useParkingSession();

  const grouped = React.useMemo(() => {
    const byDate: Record<string, ParkingSessionType[]> = {};
    history.forEach((item) => {
      const key = formatDate(item.startTime);
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(item);
    });
    return Object.entries(byDate);
  }, [history]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
      <Text style={styles.title}>Storico parcheggi</Text>
      <Text style={styles.subtitle}>{history.length} sessioni</Text>
      <FlatList
        data={grouped}
        keyExtractor={([date]) => date}
        contentContainerStyle={styles.list}
        renderItem={({ item: [date, sessions] }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{date}</Text>
            {sessions.map((session) => (
              <HistoryItem key={session.id} item={session} />
            ))}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  list: {
    paddingBottom: Spacing.xxl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  zoneName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  address: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  meta: {
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  cost: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: Spacing.sm,
  },
});
