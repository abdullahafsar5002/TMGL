import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tmgl.league',
  appName: 'TMGL',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedOrientation: false,
  },
  plugins: {},
};

export default config;
