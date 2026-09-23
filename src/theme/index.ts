import { colors } from './colors';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 999,
} as const;

export const typography = {
  mono: 'SpaceMono', // fallback handled in App
  sans: 'System',
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 28,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  chart: {
    candleWidth: 8,
    candleGap: 2,
    volumeHeightRatio: 0.15,
    pricePaneFlex: 3,
    indicatorPaneFlex: 1,
    minVisibleBars: 20,
    maxVisibleBars: 300,
    defaultVisibleBars: 80,
  },
};

export type Theme = typeof theme;
export { colors };
export default theme;
