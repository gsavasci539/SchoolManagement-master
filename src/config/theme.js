// Design system matching SchoolManagement-master frontend
import { moderateScale, verticalScale as moderateVerticalScale, scale } from 'react-native-size-matters';
import { PixelRatio, Dimensions } from 'react-native';

const pixelRatio = PixelRatio.get();
const fontScale = PixelRatio.getFontScale();
const { width } = Dimensions.get('window');

// Adjust scale factor based on screen width and pixel density
const getScaleFactor = () => {
  if (width >= 428) return 1.05; // Samsung A26, iPhone Pro Max
  if (width >= 414) return 1.0;  // iPhone 14 Pro Max
  if (width >= 390) return 0.95; // iPhone 14
  if (width >= 375) return 0.9;  // Standard phones
  return 0.85; // Small phones
};

const scaleFactor = getScaleFactor();

export const colors = {
  // Primary colors
  brand: '#176b5b',
  brandDark: '#114c43',
  brandLight: '#24947c',
  
  // Navy (sidebar)
  navy: '#142a2d',
  
  // Neutral colors
  ink: '#17282b',
  muted: '#6e7b7d',
  canvas: '#f4f6f3',
  surface: '#ffffff',
  surfaceSoft: '#eef2ee',
  line: '#dfe6e1',
  
  // Accent colors
  accent: '#e9a74d',
  
  // Status colors
  danger: '#c34b4b',
  success: '#2c8a6f',
  warning: '#b47626',
  info: '#397c92',
  
  // Text colors
  text: {
    primary: '#17282b',
    secondary: '#6e7b7d',
    light: '#95aaa7',
    inverse: '#edf5f1',
  },
  
  // Background colors
  background: {
    primary: '#f4f6f3',
    secondary: '#ffffff',
    navy: '#142a2d',
  },
};

export const spacing = {
  xs: moderateScale(4 * scaleFactor),
  sm: moderateScale(8 * scaleFactor),
  md: moderateScale(12 * scaleFactor),
  lg: moderateScale(16 * scaleFactor),
  xl: moderateScale(20 * scaleFactor),
  xxl: moderateScale(24 * scaleFactor),
  xxxl: moderateScale(30 * scaleFactor),
};

export const borderRadius = {
  sm: moderateScale(9 * scaleFactor),
  md: moderateScale(11 * scaleFactor),
  lg: moderateScale(12 * scaleFactor),
  xl: moderateScale(13 * scaleFactor),
  xxl: moderateScale(16 * scaleFactor),
  xxxl: moderateScale(18 * scaleFactor),
  round: 99,
};

export const fontSize = {
  xs: moderateScale(10 * scaleFactor / fontScale),
  sm: moderateScale(11 * scaleFactor / fontScale),
  base: moderateScale(12 * scaleFactor / fontScale),
  md: moderateScale(13 * scaleFactor / fontScale),
  lg: moderateScale(14 * scaleFactor / fontScale),
  xl: moderateScale(15 * scaleFactor / fontScale),
  xxl: moderateScale(16 * scaleFactor / fontScale),
  xxxl: moderateScale(18 * scaleFactor / fontScale),
  huge: moderateScale(20 * scaleFactor / fontScale),
  massive: moderateScale(25 * scaleFactor / fontScale),
  giant: moderateScale(27 * scaleFactor / fontScale),
  colossal: moderateScale(34 * scaleFactor / fontScale),
};

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: moderateScale(2 * scaleFactor) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(4 * scaleFactor),
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: moderateScale(4 * scaleFactor) },
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(16 * scaleFactor),
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: moderateScale(16 * scaleFactor) },
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(50 * scaleFactor),
    elevation: 8,
  },
};

export const commonStyles = {
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxxl,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.small,
  },
  button: {
    borderRadius: borderRadius.lg,
    minHeight: moderateVerticalScale(42 * scaleFactor),
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.brand,
    ...shadows.small,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: moderateVerticalScale(43 * scaleFactor),
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxxl,
    padding: spacing.xxl,
    ...shadows.small,
  },
};

export default {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  shadows,
  commonStyles,
};
