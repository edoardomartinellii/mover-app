import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { ParkingSession, ParkingZone, Vehicle } from '../constants/types';
import { MOCK_VEHICLES, MOCK_HISTORY } from '../constants/mockData';

interface ParkingSessionContextType {
  activeSession: ParkingSession | null;
  history: ParkingSession[];
  vehicles: Vehicle[];
  startSession: (zone: ParkingZone, vehicle: Vehicle, durationMinutes: number) => void;
  stopSession: () => void;
  extendSession: (additionalMinutes: number) => void;
  remainingTimeMs: number;
}

const ParkingSessionContext = createContext<ParkingSessionContextType | null>(null);

export function ParkingSessionProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSession] = useState<ParkingSession | null>(null);
  const [history, setHistory] = useState<ParkingSession[]>(MOCK_HISTORY);
  const [vehicles] = useState<Vehicle[]>(MOCK_VEHICLES);
  const [remainingTimeMs, setRemainingTimeMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (activeSession?.status === 'active') {
      timerRef.current = setInterval(() => {
        const remaining = activeSession.endTime.getTime() - Date.now();
        if (remaining <= 0) {
          if (timerRef.current !== undefined) clearInterval(timerRef.current);
          setActiveSession(prev => (prev ? { ...prev, status: 'expired' } : null));
          setRemainingTimeMs(0);
        } else {
          setRemainingTimeMs(remaining);
        }
      }, 1000);
      return () => {
        if (timerRef.current !== undefined) clearInterval(timerRef.current);
      };
    }
  }, [activeSession]);

  const startSession = useCallback(
    (zone: ParkingZone, vehicle: Vehicle, durationMinutes: number) => {
      const now = new Date();
      const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000);
      const session: ParkingSession = {
        id: Date.now().toString(),
        zone,
        vehicle,
        startTime: now,
        endTime,
        durationMinutes,
        totalCost: (durationMinutes / 60) * zone.pricePerHour,
        status: 'active',
      };
      setActiveSession(session);
      setRemainingTimeMs(durationMinutes * 60 * 1000);
    },
    [],
  );

  const stopSession = useCallback(() => {
    if (activeSession) {
      if (timerRef.current !== undefined) clearInterval(timerRef.current);
      const completed: ParkingSession = {
        ...activeSession,
        status: 'completed',
        endTime: new Date(),
      };
      setHistory(prev => [completed, ...prev]);
      setActiveSession(null);
      setRemainingTimeMs(0);
    }
  }, [activeSession]);

  const extendSession = useCallback(
    (additionalMinutes: number) => {
      if (activeSession) {
        const newEndTime = new Date(
          activeSession.endTime.getTime() + additionalMinutes * 60 * 1000,
        );
        const newDuration = activeSession.durationMinutes + additionalMinutes;
        setActiveSession({
          ...activeSession,
          endTime: newEndTime,
          durationMinutes: newDuration,
          totalCost: (newDuration / 60) * activeSession.zone.pricePerHour,
        });
      }
    },
    [activeSession],
  );

  return (
    <ParkingSessionContext.Provider
      value={{
        activeSession,
        history,
        vehicles,
        startSession,
        stopSession,
        extendSession,
        remainingTimeMs,
      }}
    >
      {children}
    </ParkingSessionContext.Provider>
  );
}

export function useParkingSession() {
  const context = useContext(ParkingSessionContext);
  if (!context) {
    throw new Error('useParkingSession must be used within ParkingSessionProvider');
  }
  return context;
}
