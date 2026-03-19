import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.jhlee.kab',
  appName: 'KAB',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // [개발용 Live Reload] 아래 주석 해제 후 Mac IP로 변경하세요
    // url: 'http://192.168.1.152:5173',
    // cleartext: true,
  },
  plugins: {
    Preferences: {},
  },
}

export default config
