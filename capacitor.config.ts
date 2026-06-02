import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ch.fitogether.app',
  appName: 'FitTogetherPlus',
  webDir: 'dist',
  plugins: {
    CapacitorUpdater: {
      autoUpdate: false
    }
  }
};

export default config;
