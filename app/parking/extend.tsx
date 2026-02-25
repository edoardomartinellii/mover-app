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
import {
  useSharedValue,
  useAnimatedReaction,
  withDecay,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Line, G } from 'react-native-svg';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useParkingSession } from '../../hooks/useParkingSession';
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
const MINUTES_PER_TURN = 60;
const MAX_HOURS = 4;
const MAX_DEG = MAX_HOURS * 360;
const MIN_MINUTES = 1;
const STEP = 1;

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

function formatEndTime(baseEndTime: Date, extraMinutes: number): string {
  const end = new Date(baseEndTime.getTime() + extraMinutes * 60000);
  const isNextDay = end.getDate() !== new Date().getDate();
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

function buildArcLayers(totalDeg: number): ArcLayer[] {
  if (totalDeg <= 0) return [];
  const completedTurns = Math.floor(totalDeg / 360);
  const remainder = totalDeg % 360;
  const layers: ArcLayer[] = [];

  const TURN_COLORS = [Colors.primary, Colors.accent, Colors.primary, Colors.accent];
  for (let i = 0; i < completedTurns; i++) {
    layers.push({ path: fullCirclePath(), color: TURN_COLORS[i % TURN_COLORS.length], full: true });
  }
  if (remainder > 0.5) {
    const color = TURN_COLORS[completedTurns % TURN_COLORS.length];
    const tip = polarToXY(remainder, ARC_R);
    layers.push({ path: arcPath(0, remainder), color, full: false, tipX: tip.x, tipY: tip.y });
  }
  return layers;
}

export default function ExtendParkingScreen() {
  const router = useRouter();
  const { activeSession, extendSession } = useParkingSession();

  const arcDegSV = useSharedValue(0);
  const [arcDeg, setArcDeg] = useState(0);

  const prevAngleSV = useSharedValue(-1);
  const dialPageX = useSharedValue(0);
  const dialPageY = useSharedValue(0);
  const angularVelSV = useSharedValue(0);
  const lastHapticStep = useSharedValue(-1);

  const hasSelection = arcDeg > 1;
  const extraMinutes = hasSelection ? angleToMinutes(arcDeg) : 0;

  const triggerHaptic = useCallback(() => { Haptics.selectionAsync(); }, []);
  const syncArcDeg = useCallback((deg: number) => { setArcDeg(deg); }, []);

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
          angularVelSV.value = angularVelSV.value * 0.7 + (delta / 16) * 0.3;
        })
        .onEnd(() => {
          'worklet';
          prevAngleSV.value = -1;
          arcDegSV.value = withDecay({
            velocity: angularVelSV.value * 1000,
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

  const handleConfirm = useCallback(() => {
    if (!hasSelection || !activeSession) return;
    extendSession(extraMinutes);
    router.back();
  }, [hasSelection, extraMinutes, extendSession, activeSession, router]);

  if (!activeSession) {
    return (
      <View style={styles.container}>
        <Text style={{ color: Colors.error, padding: 20 }}>Nessuna sessione attiva.</Text>
      </View>
    );
  }

  const newEndTime = formatEndTime(activeSession.endTime, extraMinutes);
  const addedCost = (extraMinutes / 60) * activeSession.zone.pricePerHour;

  return (
    <>
      <Stack.Screen options={{ title: 'Modifica durata' }} />

      <View style={styles.container}>

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
              <Circle cx={CX} cy={CY} r={TRACK_R} fill="#EBEBEB" stroke="none" />

              {buildArcLayers(arcDeg).map((layer, i) => (
                <G key={i}>
                  <Path
                    d={layer.path}
                    stroke={layer.color}
                    strokeWidth={STROKE_W}
                    fill="none"
                    strokeLinecap="butt"
                  />
                  {!layer.full && layer.tipX !== undefined && layer.tipY !== undefined && (
                    <Circle cx={layer.tipX} cy={layer.tipY} r={STROKE_W / 2} fill={layer.color} />
                  )}
                </G>
              ))}

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
                      x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                      stroke="#1A1A1A" strokeWidth={isMain ? 2.5 : 1.5}
                      strokeLinecap="round" opacity={0.55}
                    />
                  );
                })}
              </G>
            </Svg>
          </View>
        </GestureDetector>

        {/* Titolo / durata aggiuntiva */}
        <View style={styles.titleBlock} pointerEvents="none">
          {hasSelection ? (
            <Text style={styles.durationText} numberOfLines={1} adjustsFontSizeToFit>
              +{formatDuration(extraMinutes)}
            </Text>
          ) : (
            <>
              <Text style={styles.giraTitle}>Gira</Text>
              <Text style={styles.giraSub}>per aggiungere{'\n'}tempo</Text>
            </>
          )}
        </View>

        {/* Badge nuovo termine */}
        <View style={styles.termineBadge} pointerEvents="none">
          <Text style={styles.termineIcon}>🕐</Text>
          <Text style={styles.termineText}>
            {hasSelection
              ? `Nuovo termine ${newEndTime}`
              : `Termine attuale ${activeSession.endTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`}
          </Text>
        </View>

        {/* Bottone conferma */}
        <TouchableOpacity
          style={[styles.continueBtn, hasSelection && styles.continueBtnActive]}
          onPress={handleConfirm}
          activeOpacity={hasSelection ? 0.75 : 1}
        >
          <Text style={[styles.continueBtnText, hasSelection && styles.continueBtnTextActive]}>
            {hasSelection
              ? `+${addedCost.toFixed(2)} € • Aggiorna sosta`
              : '– • Aggiorna sosta'}
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
    marginTop: 160,
  },
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
    top: 28 + 160 + Spacing.sm,
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
