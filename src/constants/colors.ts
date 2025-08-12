// Color palette based on the mihmandar.org design
export const Colors = {
  primary: '#177267',      // Green - buttons, active tabs, links
  secondary: '#ffc574',    // Orange - highlights, notification icons, special cards
  background: '#F8F9FA',   // Light gray - main background
  text: '#212529',         // Dark gray - main text
  white: '#FFFFFF',
  lightGray: '#E9ECEF',
  darkGray: '#6C757D',
  success: '#28A745',
  warning: '#FFC107',
  error: '#DC3545',
  info: '#17A2B8',
  
  // Prayer times specific colors
  currentPrayer: '#177267',
  pastPrayer: '#6C757D',
  upcomingPrayer: '#212529',
  
  // Qibla compass colors
  compassBorder: '#177267',
  compassNeedle: '#DC3545',
  compassBackground: '#F8F9FA',
  
  // Shadow colors
  shadow: {
    ios: '#000',
    android: '#000',
  },
};

export const getDynamicColors = (isDark: boolean) => ({
  background: isDark ? '#1A1A1A' : Colors.background,
  surface: isDark ? '#2D2D2D' : Colors.white,
  text: isDark ? '#FFFFFF' : Colors.text,
  textSecondary: isDark ? '#B0B0B0' : Colors.darkGray,
  border: isDark ? '#404040' : Colors.lightGray,
});

export default Colors;
