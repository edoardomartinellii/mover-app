import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Car, Park, Clock, CreditCard } from 'phosphor-react-native';
import { useParkingSession } from '../../hooks/useParkingSession';
import { PARKING_ZONES } from '../../constants/parkingZones';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/colors';

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function formatEndTime(extraMinutes: number): string {
  const now = new Date();
  const end = new Date(now.getTime() + extraMinutes * 60000);
  const isNextDay = end.getDate() !== now.getDate();
  const time = end.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return isNextDay ? `domani ${time}` : time;
}

function formatStartTime(): string {
  return new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

/** Targa italiana stilizzata */
function ItalianPlate({ plate }: { plate: string }) {
  return (
    <View style={plateStyles.container}>
      <View style={plateStyles.blueStrip} />
      <Text style={plateStyles.plateText}>{plate}</Text>
    </View>
  );
}

const plateStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1A1A1A',
    borderRadius: 6,
    overflow: 'hidden',
    height: 36,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
  },
  blueStrip: {
    backgroundColor: '#003DA5',
    height: '100%',
    width: 14,
  },
  plateText: {
    paddingHorizontal: 10,
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default function ConfirmParkingScreen() {
  const { zoneId, minutes } = useLocalSearchParams<{ zoneId: string; minutes: string }>();
  const router = useRouter();
  const { vehicles, startSession } = useParkingSession();

  const zone = useMemo(() => PARKING_ZONES.find((z) => z.id === zoneId), [zoneId]);
  const durationMinutes = useMemo(() => parseInt(minutes ?? '0', 10), [minutes]);
  const totalCost = useMemo(
    () => (durationMinutes / 60) * (zone?.pricePerHour ?? 0),
    [durationMinutes, zone],
  );

  const vehicle = vehicles[0];

  const [loadingVisible, setLoadingVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const scaleAnim = useMemo(() => new Animated.Value(0.7), []);
  const checkAnim = useMemo(() => new Animated.Value(0), []);

  const handleConfirm = useCallback(() => {
    if (!zone || !vehicle || durationMinutes <= 0) return;
    setLoadingVisible(true);
    setTimeout(() => {
      startSession(zone, vehicle, durationMinutes);
      setLoadingVisible(false);
      setSuccessVisible(true);
      // Anima il popup in entrata
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 120,
          friction: 8,
        }),
        Animated.timing(checkAnim, {
          toValue: 1,
          duration: 300,
          delay: 150,
          useNativeDriver: true,
        }),
      ]).start();
      // Naviga dopo 1.8s
      setTimeout(() => {
        setSuccessVisible(false);
        router.replace('/parking/active');
      }, 1800);
    }, 900);
  }, [zone, vehicle, durationMinutes, startSession, router, scaleAnim, checkAnim]);

  if (!zone) {
    return (
      <View style={styles.container}>
        <Text style={{ color: Colors.error, padding: 20 }}>Zona non trovata.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: '' }} />

      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Titolo */}
          <Text style={styles.pageTitle}>Conferma sosta</Text>
          <Text style={styles.pageSubtitle}>
            Controlla la zona, l'orario e la targa per evitare multe.
          </Text>

          {/* Card veicolo */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.row} activeOpacity={0.7}>
              <View style={[styles.rowIcon, { backgroundColor: '#E8F5E9' }]}>
                <Car size={20} color={Colors.success} weight="fill" />
              </View>
              <View style={[styles.rowCenter, { gap: 6 }]}>
                <Text style={styles.rowValue}>{vehicle?.name ?? 'Veicolo'}</Text>
                <ItalianPlate plate={vehicle?.plate ?? 'XX 000 XX'} />
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Card zona + durata + pagamento */}
          <View style={styles.section}>

            {/* Zona */}
            <TouchableOpacity style={styles.row} activeOpacity={0.7}>
              <View style={[styles.rowIcon, { backgroundColor: Colors.primaryLight }]}>
                <Park size={20} color={Colors.primary} weight="fill" />
              </View>
              <View style={styles.rowCenter}>
                <Text style={styles.rowValueBlue}>{zone.code}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>{zone.name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Durata */}
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => router.back()}
            >
              <View style={[styles.rowIcon, { backgroundColor: '#FFF3E0' }]}>
                <Clock size={20} color={Colors.warning} weight="fill" />
              </View>
              <View style={styles.rowCenter}>
                <Text style={styles.rowValue}>{formatDuration(durationMinutes)}</Text>
                <Text style={styles.rowSub}>
                  Termine {formatEndTime(durationMinutes)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Metodo pagamento */}
            <TouchableOpacity style={styles.row} activeOpacity={0.7}>
              <View style={[styles.rowIcon, { backgroundColor: '#EDE7F6' }]}>
                <CreditCard size={20} color="#7C3AED" weight="fill" />
              </View>
              <View style={styles.rowCenter}>
                <Text style={styles.rowValue}>Apple Pay</Text>
                <Text style={styles.rowSub}>Account privato</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>

          </View>
        </ScrollView>

        {/* Footer fisso */}
        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <View style={styles.totalLabelRow}>
              <Text style={styles.totalLabel}>Totale</Text>
              <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} style={{ marginLeft: 4 }} />
            </View>
            <Text style={styles.totalValue}>{totalCost.toFixed(2)} €</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.feeLabel}>Costo del servizio incluso</Text>
            <Text style={styles.feeValue}>0 €</Text>
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
            <Text style={styles.confirmBtnText}>Inizia la sosta</Text>
          </TouchableOpacity>
        </View>
      </View>
        {/* Loading overlay */}
        <Modal transparent visible={loadingVisible} animationType="fade">
          <View style={styles.overlayBg}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          </View>
        </Modal>

        {/* Success popup */}
        <Modal transparent visible={successVisible} animationType="fade">
          <View style={styles.overlayBg}>
            <Animated.View style={[styles.successCard, { transform: [{ scale: scaleAnim }] }]}>
              {/* Cerchio con spunta */}
              <Animated.View style={[styles.checkCircle, { opacity: checkAnim, transform: [{ scale: checkAnim }] }]}>
                <Ionicons name="checkmark" size={44} color={Colors.primary} />
              </Animated.View>

              <Text style={styles.successTitle}>Sosta iniziata</Text>

              {vehicle && <ItalianPlate plate={vehicle.plate} />}
            </Animated.View>
          </View>
        </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },

  section: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    ...Shadows.card,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    minHeight: 64,
  },
  rowLeft: {
    width: 28,
    alignItems: 'center',
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCenter: {
    flex: 1,
    gap: 3,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  rowValueBlue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  rowSub: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: 56,
  },

  // Footer
  footer: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  feeLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  feeValue: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
    ...Shadows.button,
  },
  confirmBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
  },

  // Modal overlay
  overlayBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadows.bottomSheet,
  },
  successCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: 48,
    alignItems: 'center',
    gap: Spacing.lg,
    ...Shadows.bottomSheet,
    minWidth: 260,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
});
