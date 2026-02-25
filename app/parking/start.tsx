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
import Svg, { Circle, Path, Line, Defs, LinearGradient, RadialGradient, Stop, G, Ellipse, Rect } from 'react-native-svg';
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

// ─── Sky scene ──────────────────────────────────────────────────────────────

const SKY_W = SCREEN_W;
const SKY_H = 200;

/** Lerp tra due colori esadecimali */
function lerpHex(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `#${((rr << 16) | (rg << 8) | rb).toString(16).padStart(6, '0')}`;
}

interface SkyPalette { top: string; bottom: string; sun: string; glow: string }

/** Restituisce la palette cielo in base all'ora (0-24) */
function skyPaletteForHour(hour: number): SkyPalette {
  // checkpoint: notte, alba, mattina, mezzogiorno, pomeriggio, tramonto, sera, notte
  const stops: Array<{ h: number } & SkyPalette> = [
    { h: 0,  top: '#0a0e2e', bottom: '#1a2050', sun: '#ffd700', glow: '#ffd70040' },
    { h: 5,  top: '#1a1a4e', bottom: '#2d2060', sun: '#ffd700', glow: '#ffd70040' },
    { h: 6,  top: '#ff6b35', bottom: '#ffb347', sun: '#fff176', glow: '#ffb34780' },
    { h: 8,  top: '#4a90d9', bottom: '#87ceeb', sun: '#fffde7', glow: '#fff9c440' },
    { h: 12, top: '#1565c0', bottom: '#42a5f5', sun: '#ffffff', glow: '#ffffff50' },
    { h: 16, top: '#2979ff', bottom: '#64b5f6', sun: '#fffde7', glow: '#fff9c440' },
    { h: 18, top: '#e65100', bottom: '#ff8a65', sun: '#ffeb3b', glow: '#ffeb3b80' },
    { h: 20, top: '#4a148c', bottom: '#7b1fa2', sun: '#ff6f00', glow: '#ff6f0060' },
    { h: 22, top: '#1a237e', bottom: '#283593', sun: '#ffd700', glow: '#ffd70040' },
    { h: 24, top: '#0a0e2e', bottom: '#1a2050', sun: '#ffd700', glow: '#ffd70040' },
  ];
  const h = ((hour % 24) + 24) % 24;
  let i = stops.findIndex(s => s.h > h) - 1;
  if (i < 0) i = 0;
  if (i >= stops.length - 1) i = stops.length - 2;
  const a = stops[i], b = stops[i + 1];
  const t = (h - a.h) / (b.h - a.h);
  return {
    top:    lerpHex(a.top,    b.top,    t),
    bottom: lerpHex(a.bottom, b.bottom, t),
    sun:    lerpHex(a.sun,    b.sun,    t),
    glow:   a.glow,
  };
}

/** Posizione del sole: arco parabolico da sinistra (alba 6h) a destra (tramonto 20h) */
function sunPosition(hour: number): { x: number; y: number } {
  const sunrise = 6, sunset = 20;
  const clampedH = Math.max(sunrise, Math.min(sunset, hour));
  const t = (clampedH - sunrise) / (sunset - sunrise); // 0=alba, 1=tramonto
  const x = SKY_W * 0.1 + t * SKY_W * 0.8;
  // parabola: y minimo (alto) a t=0.5
  const y = SKY_H * 0.85 - Math.sin(t * Math.PI) * SKY_H * 0.72;
  return { x, y };
}

function SkyScene({ endHour }: { endHour: number }) {
  const palette = skyPaletteForHour(endHour);
  const sun = sunPosition(endHour);
  const isNight = endHour < 6 || endHour >= 20;

  return (
    <Svg width={SKY_W} height={SKY_H} style={{ position: 'absolute', top: 0, left: 0 }}>
      <Defs>
        <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.top} stopOpacity="1" />
          <Stop offset="1" stopColor={palette.bottom} stopOpacity="1" />
        </LinearGradient>
        <RadialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={palette.sun} stopOpacity="0.5" />
          <Stop offset="1" stopColor={palette.sun} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#c8d6f0" stopOpacity="0.3" />
          <Stop offset="1" stopColor="#c8d6f0" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Sfondo cielo */}
      <Rect x="0" y="0" width={SKY_W} height={SKY_H} fill="url(#skyGrad)" />

      {/* Stelle (solo di notte) */}
      {isNight && [
        [40, 20], [80, 45], [130, 15], [200, 35], [260, 10], [310, 40],
        [350, 18], [60, 70], [170, 60], [280, 65], [330, 80], [100, 90],
      ].map(([sx, sy], i) => (
        <Circle key={i} cx={sx} cy={sy} r={1 + (i % 2) * 0.5}
          fill="#ffffff" opacity={0.6 + (i % 3) * 0.15} />
      ))}

      {/* Luna (di notte) */}
      {isNight && (
        <G>
          <Circle cx={SKY_W * 0.75} cy={40} r={28} fill="url(#moonGlow)" />
          <Circle cx={SKY_W * 0.75} cy={40} r={14} fill="#e8f0fe" opacity={0.95} />
          <Circle cx={SKY_W * 0.75 + 5} cy={36} r={11} fill={palette.top} opacity={0.9} />
        </G>
      )}

      {/* Alone del sole */}
      {!isNight && (
        <G>
          <Circle cx={sun.x} cy={sun.y} r={38} fill="url(#sunGlow)" />
        </G>
      )}

      {/* Sole */}
      {!isNight && (
        <G>
          {/* Raggi */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const r1 = 17, r2 = 24;
            return (
              <Line
                key={i}
                x1={sun.x + Math.cos(angle) * r1}
                y1={sun.y + Math.sin(angle) * r1}
                x2={sun.x + Math.cos(angle) * r2}
                y2={sun.y + Math.sin(angle) * r2}
                stroke={palette.sun}
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.8}
              />
            );
          })}
          {/* Disco solare */}
          <Circle cx={sun.x} cy={sun.y} r={13} fill={palette.sun} />
        </G>
      )}

      {/* Nuvola 1 */}
      <G opacity={isNight ? 0.15 : 0.85}>
        <Ellipse cx={SKY_W * 0.2} cy={SKY_H * 0.45} rx={38} ry={16} fill="#fff" />
        <Ellipse cx={SKY_W * 0.2 - 18} cy={SKY_H * 0.45 + 4} rx={22} ry={12} fill="#fff" />
        <Ellipse cx={SKY_W * 0.2 + 20} cy={SKY_H * 0.45 + 4} rx={26} ry={13} fill="#fff" />
        <Ellipse cx={SKY_W * 0.2 + 4} cy={SKY_H * 0.45 - 8} rx={20} ry={11} fill="#fff" />
      </G>

      {/* Nuvola 2 */}
      <G opacity={isNight ? 0.1 : 0.7}>
        <Ellipse cx={SKY_W * 0.72} cy={SKY_H * 0.32} rx={44} ry={14} fill="#fff" />
        <Ellipse cx={SKY_W * 0.72 - 22} cy={SKY_H * 0.32 + 3} rx={24} ry={11} fill="#fff" />
        <Ellipse cx={SKY_W * 0.72 + 22} cy={SKY_H * 0.32 + 3} rx={28} ry={12} fill="#fff" />
        <Ellipse cx={SKY_W * 0.72} cy={SKY_H * 0.32 - 7} rx={22} ry={10} fill="#fff" />
      </G>

      {/* Nuvola 3 piccola */}
      <G opacity={isNight ? 0.08 : 0.55}>
        <Ellipse cx={SKY_W * 0.5} cy={SKY_H * 0.22} rx={28} ry={10} fill="#fff" />
        <Ellipse cx={SKY_W * 0.5 - 12} cy={SKY_H * 0.22 + 2} rx={16} ry={8} fill="#fff" />
        <Ellipse cx={SKY_W * 0.5 + 14} cy={SKY_H * 0.22 + 2} rx={18} ry={8} fill="#fff" />
      </G>

      {/* Fade in basso verso bianco */}
      <LinearGradient id="fadeDown" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
        <Stop offset="1" stopColor="#ffffff" stopOpacity="1" />
      </LinearGradient>
      <Rect x="0" y="0" width={SKY_W} height={SKY_H} fill="url(#fadeDown)" />
    </Svg>
  );
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

  // Ora di termine per animazione cielo
  const endHour = useMemo(() => {
    const now = new Date();
    const endMs = now.getTime() + durationMinutes * 60000;
    const end = new Date(endMs);
    return end.getHours() + end.getMinutes() / 60;
  }, [durationMinutes]);

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

        {/* Scena cielo animata */}
        <SkyScene endHour={hasSelection ? endHour : new Date().getHours() + new Date().getMinutes() / 60} />

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
    marginTop: SKY_H - 20,
  },
  zoneNameBlock: {
    position: 'absolute',
    top: SKY_H - 8,
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
    top: SKY_H + 16,
    left: Spacing.lg,
    right: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 100,
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
    top: SKY_H + 16 + 100 + Spacing.sm,
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
