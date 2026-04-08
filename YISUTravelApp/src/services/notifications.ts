import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { registerPushToken } from './api';

// Notification-Handler: Auch im Vordergrund anzeigen
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function initNotifications(): Promise<void> {
  // Nur auf echten Geräten (nicht im Emulator für Debugging)
  if (!Device.isDevice) return;

  // Android Notification-Channel erstellen
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('chat-messages', {
      name: 'Chat Nachrichten',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  // Berechtigung anfragen
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  // FCM-Token holen und beim Backend registrieren
  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    await registerPushToken({
      token: tokenData.data,
      platform: Platform.OS,
      device_name: `${Device.modelName ?? Platform.OS} (${Platform.OS})`,
    });
  } catch {
    // Fehler ignorieren — App funktioniert auch ohne Push Notifications
  }
}
