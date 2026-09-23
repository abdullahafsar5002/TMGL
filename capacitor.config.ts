import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tmgl.league',
  appName: 'TMGL',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: ['*']
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#0B3D2E',
      showSpinner: true,
      spinnerColor: '#fbbf24',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
      launchFadeOutDuration: 300
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0B3D2E',
      overlaysWebView: true
    },
    LocalNotifications: {
      smallIcon: 'ic_launcher',
      iconColor: '#0B3D2E'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  },
  android: {
    buildOptions: {
      keystorePath: 'C:/Users/Azam Khan/.android/tmgl-release.jks',
      keystoreAlias: 'tmgl'
    },
    backgroundColor: '#0B3D2E',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
