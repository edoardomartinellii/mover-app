import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  NativeModules,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Car, Clock, CurrencyEur, Info, Prohibit, CreditCard } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import MapView, { Marker, Polygon, type Region } from 'react-native-maps';
import * as Location from 'expo-location';

import Svg, { Circle } from 'react-native-svg';
import { SearchBar } from '../../components/SearchBar';
import { ParkingZoneCard } from '../../components/ParkingZoneCard';
import { useParkingSession } from '../../hooks/useParkingSession';
import { PARKING_ZONES } from '../../constants/parkingZones';
import {
  DEFAULT_LATITUDE,
  DEFAULT_LONGITUDE,
} from '../../constants/config';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/colors';
import { findZoneAtPoint } from '../../utils/pointInPolygon';
import type { ParkingZoneData } from '../../constants/types';

const hasMapbox = !!NativeModules.RNMBXModule;
if (hasMapbox && NativeModules.RNMBXModule.setAccessToken) {
  const { MAPBOX_ACCESS_TOKEN } = require('../../constants/config');
  NativeModules.RNMBXModule.setAccessToken(MAPBOX_ACCESS_TOKEN);
}

const snapPoints = ['30%', '55%', '90%'];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeSession, remainingTimeMs } = useParkingSession();
  const [search, setSearch] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [hoveredZone, setHoveredZone] = useState<ParkingZoneData | null>(null);
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [pinSize, setPinSize] = useState({ width: 0, height: 0 });
  const bottomSheetRef = React.useRef<BottomSheet>(null);
  const lastZoneIdRef = useRef<string | null>(null);

  const filteredZones = React.useMemo(() => {
    if (!search.trim()) return PARKING_ZONES;
    const q = search.toLowerCase();
    return PARKING_ZONES.filter(
      (z) =>
        z.name.toLowerCase().includes(q) ||
        z.code.toLowerCase().includes(q) ||
        z.orario.toLowerCase().includes(q),
    );
  }, [search]);

  const mapRef = React.useRef<MapView>(null);

  const [mapRegion] = useState({
    latitude: DEFAULT_LATITUDE,
    longitude: DEFAULT_LONGITUDE,
    latitudeDelta: 0.003,
    longitudeDelta: 0.003,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = loc.coords;
        setUserLocation([longitude, latitude]);
        // Centra la mappa sulla posizione reale con zoom stretto
        mapRef.current?.animateToRegion(
          {
            latitude,
            longitude,
            latitudeDelta: 0.003,
            longitudeDelta: 0.003,
          },
          800,
        );
      }
    })();
  }, []);

  // Fires continuously while dragging → aggiornamento istantaneo
  const handleRegionChange = useCallback((region: Region) => {
    const zone = findZoneAtPoint(
      { latitude: region.latitude, longitude: region.longitude },
      PARKING_ZONES,
    );
    const newId = zone?.id ?? null;
    if (newId !== lastZoneIdRef.current) {
      lastZoneIdRef.current = newId;
      setHoveredZone(zone);
      setSelectedZoneId(newId);
      setInfoExpanded(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handleZonePress = useCallback(
    (zone: ParkingZoneData) => {
      router.push({
        pathname: '/parking/start',
        params: { zoneId: zone.id },
      });
    },
    [router],
  );

  const handleZoneTapOnMap = useCallback(
    (zone: ParkingZoneData) => {
      setSelectedZoneId(zone.id);
      setHoveredZone(zone);
      mapRef.current?.animateToRegion(
        {
          latitude: zone.centerLatitude,
          longitude: zone.centerLongitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        400,
      );
    },
    [],
  );

  const handleMyLocation = useCallback(() => {
    if (userLocation) {
      mapRef.current?.animateToRegion(
        {
          latitude: userLocation[1],
          longitude: userLocation[0],
          latitudeDelta: 0.003,
          longitudeDelta: 0.003,
        },
        500,
      );
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [userLocation]);

  const renderZoneItem = useCallback(
    (info: { item: ParkingZoneData }) => (
      <View style={styles.cardWrap}>
        <ParkingZoneCard zone={info.item} onPress={handleZonePress} />
      </View>
    ),
    [handleZonePress],
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={mapRegion}
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChange}
      >
        {PARKING_ZONES.map((zone) =>
          zone.polygons.map((polygon, polyIdx) => (
            <Polygon
              key={`${zone.id}-poly-${polyIdx}`}
              coordinates={polygon}
              fillColor={
                selectedZoneId === zone.id
                  ? `${Colors.primary}55`
                  : `${Colors.primary}25`
              }
              strokeColor={Colors.primary}
              strokeWidth={selectedZoneId === zone.id ? 3 : 1.5}
              tappable
              onPress={() => handleZoneTapOnMap(zone)}
            />
          )),
        )}
        {/* Pin fisso al centro — è DENTRO la MapView, quindi top/left 50% = centro mappa */}
        <View
          pointerEvents="none"
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setPinSize({ width, height });
          }}
          style={[
            styles.centerPinContainer,
            {
              transform: [
                { translateX: pinSize.width > 0 ? -pinSize.width / 2 : -30 },
                { translateY: pinSize.height > 0 ? -pinSize.height : -62 },
              ],
            },
          ]}
        >
          <View style={styles.pinBubble}>
            <Car size={28} color={Colors.white} weight="regular" />
          </View>
          <View style={styles.pinTail} />
        </View>
      </MapView>

      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Cerca zona parcheggio..."
        />
      </View>

      <TouchableOpacity
        style={[styles.myLocationBtn, { top: insets.top + 60 }]}
        onPress={handleMyLocation}
      >
        <Ionicons name="locate" size={24} color={Colors.primary} />
      </TouchableOpacity>

      {activeSession && (() => {
        const sessions = [activeSession]; // pronto per più sessioni future
        const SIZE = 44;
        const STROKE = 3.5;
        const R = (SIZE - STROKE) / 2;
        const CIRCUM = 2 * Math.PI * R;

        return (
          <View style={[styles.activeBannerWrapper, { top: insets.top + 60 }]}>
            {sessions.map((session, idx) => {
              const totalMs = session.durationMinutes * 60 * 1000;
              const progress = totalMs > 0 ? Math.max(0, Math.min(1, remainingTimeMs / totalMs)) : 0;
              const endTime = session.endTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
              const dash = progress * CIRCUM;
              const gap = CIRCUM - dash;
              let ringColor: string = Colors.primary;
              if (progress < 0.15) ringColor = Colors.error;
              else if (progress < 0.35) ringColor = Colors.warning;

              return (
                <TouchableOpacity
                  key={session.id ?? idx}
                  style={styles.activeBanner}
                  onPress={() => router.push('/parking/active')}
                  activeOpacity={0.92}
                >
                  <View style={styles.activeBannerRing}>
                    <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
                      <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="#E5E5EA" strokeWidth={STROKE} fill="none" />
                      <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={ringColor} strokeWidth={STROKE} fill="none"
                        strokeDasharray={`${dash} ${gap}`} strokeLinecap="round" />
                    </Svg>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activeBannerTitle}>
                      {sessions.length > 1 ? `Sosta ${idx + 1} di ${sessions.length}` : '1 sessione di sosta attiva'}
                    </Text>
                    <Text style={styles.activeBannerSub}>Termine {endTime}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })()}

      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        handleIndicatorStyle={styles.sheetIndicator}
        backgroundStyle={styles.sheetBackground}
      >
        {hoveredZone ? (
          /* Pin dentro una zona: card compatta + info espandibili */
          <View style={styles.selectedZoneContent}>

            {/* Card principale — tap → ruota durata */}
            <TouchableOpacity
              style={styles.zoneMainCard}
              activeOpacity={0.85}
              onPress={() => handleZonePress(hoveredZone)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.zoneDetailName}>{hoveredZone.name}</Text>
                <Text style={styles.zoneDetailSub}>Zona parcheggio</Text>
              </View>
              <View style={styles.zoneDetailPricePill}>
                <Text style={styles.zoneDetailPriceValue}>
                  €{hoveredZone.pricePerHour.toFixed(2)}
                </Text>
                <Text style={styles.zoneDetailPriceUnit}>/ora</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>

            {/* Tasto info — espande i dettagli */}
            <TouchableOpacity
              style={styles.infoToggleRow}
              onPress={() => setInfoExpanded((v) => !v)}
              activeOpacity={0.7}
            >
              <Info size={15} color={Colors.primary} weight="regular" />
              <Text style={styles.infoToggleText}>
                {infoExpanded ? 'Nascondi dettagli' : 'Mostra dettagli zona'}
              </Text>
              <Ionicons
                name={infoExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={Colors.primary}
              />
            </TouchableOpacity>

            {/* Info rows — visibili solo se espanse */}
            {infoExpanded && (
              <View style={styles.zoneDetailRows}>
                {!!hoveredZone.orario && (
                  <View style={styles.zoneDetailRow}>
                    <View style={styles.zoneDetailRowIcon}>
                      <Clock size={18} color={Colors.primary} weight="regular" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.zoneDetailRowLabel}>Orario</Text>
                      <Text style={styles.zoneDetailRowValue}>{hoveredZone.orario}</Text>
                    </View>
                  </View>
                )}
                {!!hoveredZone.tariffa && (
                  <View style={styles.zoneDetailRow}>
                    <View style={styles.zoneDetailRowIcon}>
                      <CurrencyEur size={18} color={Colors.primary} weight="regular" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.zoneDetailRowLabel}>Tariffa</Text>
                      <Text style={styles.zoneDetailRowValue}>{hoveredZone.tariffa}</Text>
                    </View>
                  </View>
                )}
                {!!hoveredZone.pagamento && (
                  <View style={styles.zoneDetailRow}>
                    <View style={styles.zoneDetailRowIcon}>
                      <CreditCard size={18} color={Colors.primary} weight="regular" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.zoneDetailRowLabel}>Pagamento</Text>
                      <Text style={styles.zoneDetailRowValue}>{hoveredZone.pagamento}</Text>
                    </View>
                  </View>
                )}
                {!!hoveredZone.divieto && (
                  <View style={styles.zoneDetailRow}>
                    <View style={styles.zoneDetailRowIcon}>
                      <Prohibit size={18} color="#FF3B30" weight="regular" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.zoneDetailRowLabel}>Divieto</Text>
                      <Text style={[styles.zoneDetailRowValue, { color: '#FF3B30' }]}>
                        {hoveredZone.divieto}
                      </Text>
                    </View>
                  </View>
                )}
                {!!hoveredZone.info && (
                  <View style={styles.zoneDetailRow}>
                    <View style={styles.zoneDetailRowIcon}>
                      <Info size={18} color={Colors.textSecondary} weight="regular" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.zoneDetailRowLabel}>Note</Text>
                      <Text style={styles.zoneDetailRowValue}>{hoveredZone.info}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          /* Pin fuori dalle zone */
          <>
            {/* Hint visibile al primo snap */}
            <View style={styles.noZoneHint}>
              <Car size={28} color={Colors.textTertiary} weight="light" />
              <Text style={styles.noZoneTitle}>Sposta la mappa</Text>
              <Text style={styles.noZoneSub}>
                Posiziona il pin su una zona blu{'\n'}per vedere prezzi e orari
              </Text>
            </View>

            {/* Header + lista: visibili solo tirando su la card */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Zone parcheggio</Text>
              <Text style={styles.sheetSubtitle}>{filteredZones.length} zone · Viareggio</Text>
            </View>
            <BottomSheetFlatList<ParkingZoneData>
              data={filteredZones}
              keyExtractor={(item: ParkingZoneData) => item.id}
              renderItem={renderZoneItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
    width: '100%',
  },
  topBar: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
  },
  myLocationBtn: {
    position: 'absolute',
    right: Spacing.md,
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  activeBannerWrapper: {
    position: 'absolute',
    left: Spacing.md,
    // lascia 48+8+16 = 72px per il tasto ricentra a destra
    right: 48 + Spacing.md + Spacing.sm,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    ...Shadows.card,
  },
  activeBannerRing: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  activeBannerSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  /* Center pin */
  centerPinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    alignItems: 'center',
  },
  pinBubble: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.primary,
    marginTop: -1,
  },

  /* Zona selezionata nel bottom sheet */
  selectedZoneContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  zoneMainCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.card,
    marginBottom: Spacing.sm,
  },
  infoToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  infoToggleText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  zoneDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  zoneDetailBadge: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneDetailCode: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  zoneDetailName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  zoneDetailSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  zoneDetailPricePill: {
    alignItems: 'flex-end',
  },
  zoneDetailPriceValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  zoneDetailPriceUnit: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  zoneDetailRows: {
    gap: 0,
  },
  zoneDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  zoneDetailRowIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: `${Colors.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  zoneDetailRowLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  zoneDetailRowValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
    lineHeight: 20,
  },

  /* Bottom sheet */
  noZoneHint: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    gap: 6,
  },
  noZoneTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  noZoneSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  sheetIndicator: {
    backgroundColor: Colors.border,
    width: 40,
  },
  sheetBackground: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    ...Shadows.bottomSheet,
  },
  sheetHeader: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    marginTop: 120,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  cardWrap: {
    marginBottom: Spacing.md,
  },
});
