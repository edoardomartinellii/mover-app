export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface ParkingZoneData {
  id: string;
  name: string;
  code: string;
  color: string;
  centerLatitude: number;
  centerLongitude: number;
  orario: string;
  tariffa: string;
  tariffa1: string;
  info: string;
  divieto: string;
  pagamento: string;
  pricePerHour: number;
  maxDurationMinutes: number;
  polygons: Coordinate[][];
}

/** @deprecated Use ParkingZoneData. Kept for session compatibility. */
export type ParkingZone = ParkingZoneData;

export interface Vehicle {
  id: string;
  plate: string;
  name: string;
  isDefault: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'visa' | 'mastercard' | 'apple_pay' | 'google_pay';
  lastFour: string;
  isDefault: boolean;
}

export interface ParkingSession {
  id: string;
  zone: ParkingZoneData;
  vehicle: Vehicle;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  totalCost: number;
  status: 'active' | 'completed' | 'expired';
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
}
