import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../constants/colors';

interface ParkingTimerProps {
  remainingMs: number;
  totalMs: number;
}

export function ParkingTimer({ remainingMs, totalMs }: ParkingTimerProps) {
  const { timeString, progress, color } = useMemo(() => {
    const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const p = totalMs > 0 ? remainingMs / totalMs : 0;

    let c: string = Colors.primary;
    if (p < 0.15) c = Colors.error;
    else if (p < 0.35) c = Colors.warning;

    const str =
      h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${m}:${String(s).padStart(2, '0')}`;

    return { timeString: str, progress: p, color: c };
  }, [remainingMs, totalMs]);

  return (
    <View style={styles.container}>
      <View style={[styles.outerRing, { borderColor: color }]}>
        <View style={[styles.innerCircle, { backgroundColor: `${color}10` }]}>
          <Text style={[styles.timeText, { color }]}>{timeString}</Text>
          <Text style={styles.label}>rimanente</Text>
        </View>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.max(0, Math.min(100, progress * 100))}%`, backgroundColor: color },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  outerRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  innerCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 42,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressBarContainer: {
    width: '100%',
    paddingHorizontal: Spacing.xl,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
