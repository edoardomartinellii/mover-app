import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useParkingSession } from '../../hooks/useParkingSession';
import { Button } from '../../components/Button';
import { ParkingTimer } from '../../components/ParkingTimer';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/colors';

export default function ActiveParkingScreen() {
  const router = useRouter();
  const { activeSession, stopSession, remainingTimeMs } = useParkingSession();

  const handleStop = () => {
    Alert.alert(
      'Termina parcheggio',
      'Vuoi terminare il parcheggio ora?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Termina',
          style: 'destructive',
          onPress: () => {
            stopSession();
            router.replace('/(tabs)');
          },
        },
      ],
    );
  };

  const handleExtend = () => {
    router.push('/parking/extend');
  };

  if (!activeSession || activeSession.status !== 'active') {
    return (
      <View style={styles.container}>
        <Text style={styles.noSession}>Nessun parcheggio attivo.</Text>
        <Button title="Torna alla mappa" onPress={() => router.replace('/(tabs)')} />
      </View>
    );
  }

  const totalMs = activeSession.durationMinutes * 60 * 1000;

  return (
    <View style={styles.container}>
      <ParkingTimer remainingMs={remainingTimeMs} totalMs={totalMs} />

      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Ionicons name="location" size={20} color={Colors.primary} />
          <View style={styles.detailText}>
            <Text style={styles.detailLabel}>Zona</Text>
            <Text style={styles.detailValue}>
              {activeSession.zone.name} · {activeSession.zone.code}
            </Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="car" size={20} color={Colors.primary} />
          <View style={styles.detailText}>
            <Text style={styles.detailLabel}>Targa</Text>
            <Text style={styles.detailValue}>{activeSession.vehicle.plate}</Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="wallet" size={20} color={Colors.primary} />
          <View style={styles.detailText}>
            <Text style={styles.detailLabel}>Costo attuale</Text>
            <Text style={styles.detailValue}>
              {'\u20AC'}{activeSession.totalCost.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title="Modifica durata"
          onPress={handleExtend}
          variant="secondary"
          style={styles.extendBtn}
        />
        <Button
          title="Termina parcheggio"
          onPress={handleStop}
          variant="danger"
          style={styles.stopBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  noSession: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  detailsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.xl,
    ...Shadows.card,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separator,
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  actions: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  extendBtn: {
    width: '100%',
  },
  stopBtn: {
    width: '100%',
  },
});
