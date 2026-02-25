export const Colors = {
  primary: '#003DA5',
  primaryDark: '#002970',
  primaryLight: '#E8F0FE',

  accent: '#C5E800',
  accentDark: '#A3BF00',
  accentLight: '#F4FCC2',

  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceSecondary: '#F9F9FB',

  text: '#1A1A1A',
  textSecondary: '#8E8E93',
  textTertiary: '#C7C7CC',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#1A1A1A',

  border: '#E5E5EA',
  separator: '#F2F2F7',

  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',

  black: '#000000',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.4)',
} as const;

export const Shadows = {
  card: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  button: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomSheet: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
