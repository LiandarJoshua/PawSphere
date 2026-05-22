export const lightColors = {
  // Backgrounds
  background: '#F5F3FF',
  surface: '#FFFFFF',
  surface2: '#F5F3FF',
  surface3: '#EDE9FE',

  // Text
  text: '#1C1C1E',
  textSecondary: '#636366',
  textTertiary: '#AEAEB2',

  // Brand — soft purple
  primary: '#8B5CF6',
  primaryLight: '#EDE9FE',
  primaryBorder: '#C4B5FD',
  primaryDark: '#7C3AED',

  // Semantic
  blue: '#007AFF',
  blueLight: '#EDF5FF',
  green: '#34C759',
  greenLight: '#EDFFF3',
  red: '#FF3B30',
  redLight: '#FFF0F0',
  orange: '#FF9500',
  orangeLight: '#FFF6E5',

  // UI Chrome
  border: 'rgba(0,0,0,0.06)',
  borderStrong: 'rgba(0,0,0,0.12)',
  separator: 'rgba(0,0,0,0.06)',
  tabBar: '#FFFFFF',
  tabBarBorder: 'rgba(0,0,0,0.08)',

  statusBar: 'dark' as const,
  shadow: '#000000',
};

export const darkColors: typeof lightColors = {
  // Backgrounds — deep charcoal, no black or white
  background: '#0E0E16',
  surface: '#18182A',
  surface2: '#1F1F33',
  surface3: '#28283E',

  // Text — soft, never white
  text: '#D8D8F0',
  textSecondary: '#8888A8',
  textTertiary: '#50506A',

  // Brand — muted purple, not neon
  primary: '#9D7FEA',
  primaryLight: '#1E1040',
  primaryBorder: '#3D2470',
  primaryDark: '#7C5CC9',

  // Semantic — desaturated for dark bg
  blue: '#4A9EFF',
  blueLight: '#0D1E38',
  green: '#2EBD54',
  greenLight: '#0C2018',
  red: '#E8453A',
  redLight: '#2E100E',
  orange: '#E8900A',
  orangeLight: '#2A1A00',

  // UI Chrome
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.13)',
  separator: 'rgba(255,255,255,0.07)',
  tabBar: '#18182A',
  tabBarBorder: 'rgba(255,255,255,0.07)',

  statusBar: 'light' as const,
  shadow: '#000000',
};

export type AppColors = typeof lightColors;
