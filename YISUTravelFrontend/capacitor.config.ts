import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yisutravelgmbh.yisutravelapp',
  appName: 'YISU Travel GmbH',
  webDir: 'dist/yisu-travel/browser',
  server: {
    url: 'https://yisu-travel.de/',
    cleartext: false
  }
};

export default config;
