import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedReaction,
  withDecay,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Line, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { PARKING_ZONES } from '../../constants/parkingZones';
import { Colors, Spacing, BorderRadius } from '../../constants/colors';

const { width: SCREEN_W } = Dimensions.get('window');

const DIAL_SIZE = SCREEN_W * 0.68;
const CX = DIAL_SIZE / 2;
const CY = DIAL_SIZE / 2;
const TRACK_R = DIAL_SIZE / 2 - 2;
const STROKE_W = 22;
const ARC_R = TRACK_R - STROKE_W / 2;
const INNER_R = TRACK_R - STROKE_W;

const TICK_COUNT = 36;
const MINUTES_PER_TURN = 60;  // 1 giro = 60 min
const MAX_HOURS = 24;
const MAX_DEG = MAX_HOURS * 360;
const MIN_MINUTES = 1;
const STEP = 1;

// Colori per i giri: alternano per creare lo stacco visivo
const TURN_COLORS = [
  Colors.primary,   // giro 1: blu
  Colors.accent,    // giro 2: lime
  Colors.primary,   // giro 3: blu
  Colors.accent,    // giro 4: lime
];

function getTurnColor(turnIndex: number): string {
  return TURN_COLORS[turnIndex % TURN_COLORS.length];
}

function polarToXY(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arcPath(startDeg: number, endDeg: number): string {
  const s = polarToXY(startDeg, ARC_R);
  const e = polarToXY(endDeg, ARC_R);
  const sweep = ((endDeg - startDeg) + 360) % 360;
  const large = sweep > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${ARC_R} ${ARC_R} 0 ${large} 1 ${e.x} ${e.y}`;
}

function fullCirclePath(): string {
  // Cerchio completo disegnato come due semicerchi
  const top = polarToXY(0, ARC_R);
  const bot = polarToXY(180, ARC_R);
  return `M ${top.x} ${top.y} A ${ARC_R} ${ARC_R} 0 1 1 ${bot.x} ${bot.y} A ${ARC_R} ${ARC_R} 0 1 1 ${top.x} ${top.y}`;
}

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
  return isNextDay ? `domani, ${time}` : time;
}

function angleToMinutes(totalDeg: number): number {
  const raw = (Math.max(0, totalDeg) / 360) * MINUTES_PER_TURN;
  return Math.max(MIN_MINUTES, Math.min(MAX_HOURS * 60, Math.round(raw / STEP) * STEP));
}

interface ArcLayer {
  path: string;
  color: string;
  full: boolean;
  tipX?: number;
  tipY?: number;
}

// Restituisce i layer da disegnare in base all'angolo totale accumulato
function buildArcLayers(totalDeg: number): ArcLayer[] {
  if (totalDeg <= 0) return [];
  const completedTurns = Math.floor(totalDeg / 360);
  const remainder = totalDeg % 360;
  const layers: ArcLayer[] = [];

  // Giri completi → cerchi pieni, nessuna punta
  for (let i = 0; i < completedTurns; i++) {
    layers.push({ path: fullCirclePath(), color: getTurnColor(i), full: true });
  }

  // Giro corrente parziale — arco con inizio flat, punta alla fine
  if (remainder > 0.5) {
    const p = arcPath(0, remainder);
    const tip = polarToXY(remainder, ARC_R);
    layers.push({
      path: p,
      color: getTurnColor(completedTurns),
      full: false,
      tipX: tip.x,
      tipY: tip.y,
    });
  }

  return layers;
}

function calcAngle(absX: number, absY: number, dialPageX: number, dialPageY: number): number {
  const dx = absX - dialPageX - CX;
  const dy = absY - dialPageY - CY;
  const raw = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  return ((raw % 360) + 360) % 360;
}

export default function StartParkingScreen() {
  const { zoneId } = useLocalSearchParams<{ zoneId: string }>();
  const router = useRouter();

  const zone = useMemo(
    () => PARKING_ZONES.find((z) => z.id === zoneId),
    [zoneId],
  );

  // Shared values sul UI thread — zero latenza JS
  const arcDegSV = useSharedValue(0);
  const [arcDeg, setArcDeg] = useState(0);

  // Tutti i valori di stato del gesto come shared values (UI thread safe)
  const prevAngleSV = useSharedValue(-1);      // -1 = nessun angolo precedente
  const dialPageX = useSharedValue(0);
  const dialPageY = useSharedValue(0);
  const angularVelSV = useSharedValue(0);      // gradi/ms
  const lastHapticStep = useSharedValue(-1);

  const hasSelection = arcDeg > 1;
  const durationMinutes = hasSelection ? angleToMinutes(arcDeg) : 0;

  // Funzioni JS chiamabili da worklet
  const triggerHaptic = useCallback(() => {
    Haptics.selectionAsync();
  }, []);

  const syncArcDeg = useCallback((deg: number) => {
    setArcDeg(deg);
  }, []);

  // Reazione animata: ogni volta che arcDegSV cambia (anche durante decay)
  // aggiorna lo state React e triggera haptic
  useAnimatedReaction(
    () => arcDegSV.value,
    (current) => {
      runOnJS(syncArcDeg)(current);
      const step = Math.floor((current / 360) * MINUTES_PER_TURN);
      if (step !== lastHapticStep.value) {
        lastHapticStep.value = step;
        runOnJS(triggerHaptic)();
      }
    },
    [],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .simultaneousWithExternalGesture()
        .onBegin((e) => {
          'worklet';
          cancelAnimation(arcDegSV);
          angularVelSV.value = 0;
          // Calcola angolo iniziale direttamente qui nel worklet
          const dx = e.absoluteX - dialPageX.value - CX;
          const dy = e.absoluteY - dialPageY.value - CY;
          const raw = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
          prevAngleSV.value = ((raw % 360) + 360) % 360;
        })
        .onUpdate((e) => {
          'worklet';
          const dx = e.absoluteX - dialPageX.value - CX;
          const dy = e.absoluteY - dialPageY.value - CY;
          const raw = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
          const curr = ((raw % 360) + 360) % 360;
          const prev = prevAngleSV.value < 0 ? curr : prevAngleSV.value;
          prevAngleSV.value = curr;

          let delta = curr - prev;
          if (delta > 180) delta -= 360;
          if (delta < -180) delta += 360;

          arcDegSV.value = Math.max(0, Math.min(MAX_DEG, arcDegSV.value + delta));

          // Velocità angolare in gradi/ms, smorzata
          angularVelSV.value = angularVelSV.value * 0.7 + (delta / 16) * 0.3;
        })
        .onEnd(() => {
          'worklet';
          prevAngleSV.value = -1;
          const velDegPerSec = angularVelSV.value * 1000;
          arcDegSV.value = withDecay({
            velocity: velDegPerSec,
            deceleration: 0.994,
            clamp: [0, MAX_DEG],
          });
        })
        .onFinalize(() => {
          'worklet';
          prevAngleSV.value = -1;
        }),
    [],
  );

  const handleContinue = useCallback(() => {
    if (!zone || !hasSelection) return;
    router.push({
      pathname: '/parking/confirm',
      params: { zoneId: zone.id, minutes: String(durationMinutes) },
    });
  }, [zone, hasSelection, durationMinutes, router]);

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

        {/* Dial — posizione fissa, non si sposta mai */}
        <GestureDetector gesture={panGesture}>
          <View
            style={styles.dialWrapper}
            onLayout={(e) => {
              e.target.measure((_x, _y, _w, _h, px, py) => {
                dialPageX.value = px;
                dialPageY.value = py;
              });
            }}
          >
            <Svg width={DIAL_SIZE} height={DIAL_SIZE}>
              {/* Track grigio esterno */}
              <Circle cx={CX} cy={CY} r={TRACK_R} fill="#EBEBEB" stroke="none" />

              {/* Layer archi — uno per ogni giro, con colore alternato */}
              {buildArcLayers(arcDeg).map((layer, i) => (
                <G key={i}>
                  {/* Arco sempre flat su entrambi i lati */}
                  <Path
                    d={layer.path}
                    stroke={layer.color}
                    strokeWidth={STROKE_W}
                    fill="none"
                    strokeLinecap="butt"
                  />
                  {/* Cerchietto arrotondato solo alla punta finale (non sui cerchi completi) */}
                  {!layer.full && layer.tipX !== undefined && layer.tipY !== undefined && (
                    <Circle
                      cx={layer.tipX}
                      cy={layer.tipY}
                      r={STROKE_W / 2}
                      fill={layer.color}
                    />
                  )}
                </G>
              ))}

              {/* Ghiera: cerchio bianco + tick marks che ruotano insieme all'arco */}
              <G rotation={arcDeg} origin={`${CX}, ${CY}`}>
                <Circle cx={CX} cy={CY} r={INNER_R} fill="#FFFFFF" stroke="none" />
                {Array.from({ length: TICK_COUNT }).map((_, i) => {
                  const angle = (i / TICK_COUNT) * 360;
                  const isMain = i % 3 === 0;
                  const outerR = INNER_R - 5;
                  const innerR = outerR - (isMain ? 14 : 8);
                  const p1 = polarToXY(angle, outerR);
                  const p2 = polarToXY(angle, innerR);
                  return (
                    <Line
                      key={i}
                      x1={p1.x} y1={p1.y}
                      x2={p2.x} y2={p2.y}
                      stroke="#1A1A1A"
                      strokeWidth={isMain ? 2.5 : 1.5}
                      strokeLinecap="round"
                      opacity={0.55}
                    />
                  );
                })}
              </G>
            </Svg>
          </View>
        </GestureDetector>

        {/* Nome zona in cima */}
        <View style={styles.zoneNameBlock} pointerEvents="none">
          <View style={[styles.zoneDot, { backgroundColor: Colors.primary }]} />
          <Text style={styles.zoneNameText} numberOfLines={1}>{zone.name}</Text>
        </View>

        {/* Titolo / durata — assoluto, sopra il dial, non influenza il layout */}
        <View style={styles.titleBlock} pointerEvents="none">
          {hasSelection ? (
            <Text style={styles.durationText} numberOfLines={1} adjustsFontSizeToFit>
              {formatDuration(durationMinutes)}
            </Text>
          ) : (
            <>
              <Text style={styles.giraTitle}>Gira</Text>
              <Text style={styles.giraSub}>per selezionare{'\n'}il tempo</Text>
            </>
          )}
        </View>

        {/* Badge termine — assoluto */}
        <View style={styles.termineBadge} pointerEvents="none">
          <Text style={styles.termineIcon}>{hasSelection ? '🕐' : '⊘'}</Text>
          <Text style={styles.termineText}>
            Termine {hasSelection ? formatEndTime(durationMinutes) : formatEndTime(0)}
          </Text>
        </View>

        {/* Pulsante Continua */}
        <TouchableOpacity
          style={[styles.continueBtn, hasSelection && styles.continueBtnActive]}
          onPress={handleContinue}
          activeOpacity={hasSelection ? 0.75 : 1}
        >
          <Text style={[styles.continueBtnText, hasSelection && styles.continueBtnTextActive]}>
            {hasSelection
              ? `${((durationMinutes / 60) * (zone?.pricePerHour ?? 0)).toFixed(2)} € • Continua`
              : '– • Continua'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl,
  },
  dialWrapper: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    marginTop: 180,
  },
  zoneNameBlock: {
    position: 'absolute',
    top: -16,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  zoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  zoneNameText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
    flexShrink: 1,
  },
  zoneCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    opacity: 0.6,
  },

  // Titolo e badge sono assoluti: non spostano il dial
  titleBlock: {
    position: 'absolute',
    top: 28,
    left: Spacing.lg,
    right: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 160,
  },
  giraTitle: {
    fontSize: 64,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -2,
    lineHeight: 72,
  },
  giraSub: {
    fontSize: 32,
    fontWeight: '400',
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 40,
    marginTop: 4,
  },
  durationText: {
    fontSize: 56,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -2,
    textAlign: 'center',
  },
  termineBadge: {
    position: 'absolute',
    top: 28 + 160 + Spacing.sm,  // subito sotto il titleBlock
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
  },
  termineIcon: { fontSize: 15 },
  termineText: {
    fontSize: 15,
    color: '#3A3A3C',
    fontWeight: '500',
  },
  continueBtn: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 44 : Spacing.xl,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: '#E5E5EA',
    paddingVertical: 18,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  continueBtnActive: {
    backgroundColor: Colors.primary,
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#3A3A3C',
  },
  continueBtnTextActive: {
    color: '#FFFFFF',
  },
});
