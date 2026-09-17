import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tmgl.league',
  appName: 'TMGL',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {},
};

export default config;
