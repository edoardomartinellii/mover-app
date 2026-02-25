import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ParkingZoneData } from '../constants/types';
import { Colors, BorderRadius, Shadows, Spacing } from '../constants/colors';

interface ParkingZoneCardProps {
  zone: ParkingZoneData;
  onPress: (zone: ParkingZoneData) => void;
}

export function ParkingZoneCard({ zone, onPress }: ParkingZoneCardProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(zone)}
      activeOpacity={0.7}
    >
      <View style={[styles.colorBadge, { backgroundColor: zone.color }]}>
        <Text style={styles.codeText}>{zone.code}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.name}>{zone.name}</Text>
        <Text style={styles.orario} numberOfLines={1}>{zone.orario}</Text>
        <Text style={styles.price}>
          {'\u20AC'}{zone.pricePerHour.toFixed(2)}/h
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.card,
  },
  colorBadge: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  orario: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 2,
  },
});
