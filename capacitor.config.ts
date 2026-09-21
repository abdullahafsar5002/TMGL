import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tmgl.league',
  appName: 'TMGL',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#064e3b',
      showSpinner: true,
      spinnerColor: '#fbbf24'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#064e3b'
    }
  }
};

export default config;
