/// <reference types="@capawesome/capacitor-badge" />
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yisutravelgmbh.yisutravelapp',
  appName: 'YISU Travel GmbH',
  webDir: 'dist/yisu-travel/browser',
  server: {
    url: 'https://yisu-travel.de/',
    cleartext: false
  },
  plugins: {
    Badge: {
      persist: true,
      autoClear: false
    }
  }
};

export default config;
