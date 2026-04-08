# YISUTravelApp — Entwicklungshinweise

## Projekt-Übersicht
Echte native React Native + Expo App für Android/iOS.
**Kein Expo Go** — eigene native APK.

Backend: `https://backend.yisu-travel.de/api`
Bundle-ID: `com.yisutravelgmbh.yisaapp`

---

## App starten (täglich)

### Schritt 1 — Metro Bundler (immer notwendig)
```bash
cd YISUTravelApp
npx expo start --port 8081
```
Läuft im Hintergrund. Die App im Emulator lädt bei JS-Änderungen automatisch neu.

### Schritt 2 — Emulator starten
Android Studio öffnen → Device Manager → Emulator starten

### Schritt 3 — App öffnen
Entweder im Emulator auf das YISA-Icon klicken, oder:
```bash
"$HOME/AppData/Local/Android/Sdk/platform-tools/adb.exe" shell am start -n com.yisutravelgmbh.yisaapp/.MainActivity
```

---

## Neu bauen (nur bei neuen nativen Paketen)
Wenn `npm install <paket>` mit nativen Modulen ausgeführt wurde:

```bash
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
npx expo run:android
```

> **Wichtig:** `JAVA_HOME` muss auf Android Studios JDK 21 zeigen.
> Das System-JDK (v24) ist zu neu und inkompatibel mit React Native.

---

## Warum nicht Expo Go?
Expo Go ist eine generische Test-App mit fest eingebauten nativen Modulen.
Unsere Pakete (`@react-navigation/native-stack`, `pusher-js` etc.) sind damit inkompatibel → `java.lang.String cannot be cast to Boolean` Crash.

Die eigene native APK via `expo run:android` hat dieses Problem nicht.

---

## Projekt-Struktur
```
src/
├── screens/
│   ├── SplashScreen.tsx      → Token prüfen beim Start
│   ├── OnboardingScreen.tsx  → Telefon + Name + Email (einmalig)
│   ├── ChatScreen.tsx        → WhatsApp-Style Chat mit YISA
│   └── SettingsScreen.tsx    → Profil bearbeiten, Logout
├── services/
│   ├── api.ts                → Alle API-Calls (axios + Bearer Token)
│   └── pusherClient.ts       → Echtzeit via Pusher (chat.{sessionId})
├── store/
│   └── authStore.ts          → Token in Expo SecureStore
└── components/
    ├── MessageBubble.tsx
    └── TypingIndicator.tsx
```

## Auth-Flow
- Telefonnummer = Identifier (kein Passwort)
- `POST /api/mobile/register` → Token + Session-ID
- `POST /api/mobile/login` → Token + Session-ID (wenn Nummer bekannt)
- Token wird in **Expo SecureStore** gespeichert (sicher, kein localStorage)

## Pusher
- Channel: `chat.{sessionId}`
- Event: `message.received`
- Key: `1d031260d5bf381a1f39`, Cluster: `eu`
