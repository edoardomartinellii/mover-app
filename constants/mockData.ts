import { Vehicle, PaymentMethod, ParkingSession, User } from './types';
import { PARKING_ZONES } from './parkingZones';

export const MOCK_USER: User = {
  id: '1',
  firstName: 'Marco',
  lastName: 'Rossi',
  email: 'marco.rossi@email.com',
  phone: '+39 333 123 4567',
};

export const MOCK_VEHICLES: Vehicle[] = [
  {
    id: '1',
    plate: 'AB 123 CD',
    name: 'La mia auto',
    isDefault: true,
  },
  {
    id: '2',
    plate: 'EF 456 GH',
    name: 'Auto di lavoro',
    isDefault: false,
  },
];

export const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: '1',
    type: 'mastercard',
    lastFour: '0912',
    isDefault: true,
  },
  {
    id: '2',
    type: 'visa',
    lastFour: '1099',
    isDefault: false,
  },
];

export const MOCK_HISTORY: ParkingSession[] = [
  {
    id: 'h1',
    zone: PARKING_ZONES[0],
    vehicle: MOCK_VEHICLES[0],
    startTime: new Date(Date.now() - 86400000),
    endTime: new Date(Date.now() - 86400000 + 7200000),
    durationMinutes: 120,
    totalCost: 3.0,
    status: 'completed',
  },
  {
    id: 'h2',
    zone: PARKING_ZONES[2],
    vehicle: MOCK_VEHICLES[0],
    startTime: new Date(Date.now() - 172800000),
    endTime: new Date(Date.now() - 172800000 + 5400000),
    durationMinutes: 90,
    totalCost: 3.0,
    status: 'completed',
  },
  {
    id: 'h3',
    zone: PARKING_ZONES[1],
    vehicle: MOCK_VEHICLES[1],
    startTime: new Date(Date.now() - 259200000),
    endTime: new Date(Date.now() - 259200000 + 3600000),
    durationMinutes: 60,
    totalCost: 1.0,
    status: 'expired',
  },
];
