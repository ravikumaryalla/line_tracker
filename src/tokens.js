// Color tokens ported from the Juricat design system used by the source mock.
export const colors = {
  brandNavy: '#002C61',
  brandPrimary600: '#1e88e5',
  brandPrimary700: '#1976d2',
  brandPrimary800: '#1565c0',
  brandPrimary900: '#0d47a1',
  brandPrimary50: '#e3f2fd',

  success500: '#4caf50',
  success600: '#43a047',
  success700: '#388e3c',
  success800: '#2e7d32',
  success900: '#1b5e20',
  success50: '#e8f5e9',

  error500: '#f44336',
  error600: '#e53935',
  error800: '#c62828',
  error900: '#b71c1c',
  error50: '#ffebee',
  error200: '#ef9a9a',

  warning300: '#ffb74d',
  warning200: '#ffcc80',
  warning600: '#fb8c00',
  warning900: '#e65100',
  warning50: '#fff3e0',

  neutral50: '#fafafa',
  neutral100: '#f5f5f5',
  neutral200: '#eeeeee',
  neutral300: '#e0e0e0',

  fg1: 'rgba(0,0,0,0.87)',
  fg2: 'rgba(0,0,0,0.6)',
  fg3: 'rgba(0,0,0,0.5)',
  fg4: 'rgba(0,0,0,0.38)',

  white: '#ffffff',
};

// RN has no CSS box-shadow — these combine iOS shadow* props with Android elevation.
export const cardShadowSm = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 3,
  elevation: 2,
};

export const cardShadowMd = {
  shadowColor: colors.brandNavy,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 6,
  elevation: 4,
};

export const cardShadowLg = {
  shadowColor: colors.brandNavy,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.2,
  shadowRadius: 15,
  elevation: 8,
};
