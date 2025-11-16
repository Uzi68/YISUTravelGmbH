# Mobile Push Notifications (Android + Laravel)

This document walks through everything that is required to deliver push notifications from the Laravel 11 backend to the Capacitor-based Android build of the Angular admin dashboard. Follow all sections in order – the push integration will not work unless *all* steps are completed.

## 1. Backend (Laravel) prerequisites

1. **Environment variables**

   Add the following keys to `.env` (production + local). Use the Firebase service-account JSON you downloaded from the Google Cloud console:
   ```dotenv
   FCM_ENABLED=true
   FCM_PROJECT_ID=yisu-travel-gmbh
   FCM_CREDENTIALS_FILE=/var/www/yisu/storage/app/firebase-admin.json
   # Optional if you cannot mount the JSON file:
   # FCM_CLIENT_EMAIL=firebase-adminsdk@example.iam.gserviceaccount.com
   # FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
   Place the JSON at the path referenced by `FCM_CREDENTIALS_FILE` (never commit it to git). The backend now uses Google’s HTTP v1 API and signs requests with this service account—no legacy server key needed.

2. **Database migration**

   Install the new `push_subscriptions` table:
   ```bash
   php artisan migrate
   ```

   The table stores one row per authenticated staff device (token, platform, device id, last seen timestamps).

3. **Queued notifications (optional but recommended)**

   The new `App\Services\PushNotificationService` uses the HTTP legacy FCM endpoint. For production stability consider queueing the `notifyStaffAboutChatMessage` call (e.g. dispatch a job from `ChatbotController@sendToHumanChat`) so slow FCM responses cannot delay chat handling.

4. **Testing the endpoint**

   With an authenticated Admin/Agent session, call:
   ```bash
   curl -X POST https://<backend-domain>/api/push-subscriptions \
     -H "Cookie: XSRF-TOKEN=...; yisu_session=..." \
     -H "X-XSRF-TOKEN: ..." \
     -d '{
       "token":"test-token",
       "device_id":"debug-device",
       "device_name":"curl",
       "platform":"android",
       "app_version":"0.0.0"
     }'
   ```
   You should see `{ "success": true, ... }` and a new row in `push_subscriptions`.

## 2. Firebase & FCM setup

1. **Create a Firebase project** (if not already) and enable Cloud Messaging.
2. **Add an Android app** with the Capacitor package id (`com.yisutravelgmbh.yisutravelapp`). Download the generated `google-services.json`.
3. Place `google-services.json` inside `YISUTravelFrontend/android/app/`.
4. Verify `android/build.gradle` already contains `classpath 'com.google.gms:google-services:4.4.2'` (it does) and that `android/app/build.gradle` applies the `com.google.gms.google-services` plugin (the template already does so; keep it below the `apply from: 'capacitor.build.gradle'` line).
5. No further Gradle changes are required; the Capacitor push plugin pulls the Firebase Messaging dependency automatically.

> ⚠️ Android emulators without Google Play Services cannot receive FCM pushes. Use a physical device or a recent emulator image with the Play Store variant.

## 3. Angular / Capacitor steps

1. Install the Capacitor push plugin (already present in `package.json`) **and** the badge helper (needed for the unread counter shown on the Android launcher):  
   ```bash
   npm install
   npm install @capawesome/capacitor-badge
   ```
2. Rebuild native platforms so Capacitor registers the plugins:
   ```bash
   npx cap sync android
   npx cap open android
   ```
3. Run the app on device via Android Studio. After an Admin/Agent logs in, the new `StaffPushNotificationService` requests FCM permission, registers the device token, and POSTs it to `/api/push-subscriptions`.
4. Closing the session/logging out removes the device via `DELETE /api/push-subscriptions/device/{deviceId}` and clears the badge counter.

## 4. Deep-link navigation behaviour

* Push payload now ships both the numeric chat id and the visitor `session_id`.  
* Tapping the notification stores that identifier locally and triggers Angular Router navigation to `/admin-dashboard?chatId=<session_or_chat_id>`.  
* `AdminDashboardComponent` watches the query parameters *and* checks the stored push identifier. If the chat has not been loaded yet the id is persisted and retried after the next refresh or Pusher update, ensuring the correct conversation always opens.
* For each unread message the dashboard recalculates the total counter, refreshes the browser tab title, and updates the Android app-icon badge via `@capawesome/capacitor-badge`. The counter resets automatically once all chats are read or the agent logs out.

## 5. Verifying the full flow

1. Launch the Android build, log in as Admin/Agent, and ensure the device grants push permission (check Logcat for `Push token sync` messages).
2. From another browser start a visitor chat (either via the public widget or the `send-to-human` endpoint). When the visitor sends a message:
   * `ChatbotController@sendToHumanChat` persists the message and calls `PushNotificationService->notifyStaffAboutChatMessage()`.
   * FCM delivers the push to all active tokens belonging to the assigned agent or, if unassigned, to every logged-in Admin/Agent device.
3. Tap the notification. The admin dashboard opens directly with the correct chat selected and unread counter reset.

## 6. Troubleshooting

| Symptom | How to fix |
| --- | --- |
| No push arrives | Ensure `FCM_ENABLED=true`, the service-account path/credentials are correct, device token stored (`push_subscriptions` table), and the device has Google Play Services. |
| 401/403 while registering | Only authenticated users with role `Admin` or `Agent` may call `/api/push-subscriptions`. |
| Click does nothing | Confirm the notification payload contains `session_id` (check Laravel log) and that the Android intent opens the Capacitor WebView (needs the app to be installed, not just a browser tab). |
| Token invalid after reinstall | The service uses a generated `device_id`. Clearing app storage or reinstalling regenerates it. Old rows are auto-disabled when the same device registers a new token. Run the cleanup endpoint `DELETE /api/push-subscriptions/device/{deviceId}` if necessary. |

## 7. Next steps (optional)

* Add iOS support by dropping `GoogleService-Info.plist` into `ios/App/App/` and running `npx cap sync ios`.
* Move push dispatching into queued jobs for better resilience.
* Add per-user notification preferences (mute per device) by extending the `push_subscriptions` table.
* Record delivery errors from FCM (the service logs failures already) and deactivate tokens that repeatedly fail.

With these steps the entire stack (Laravel → FCM → Capacitor Android → Angular admin dashboard) is wired for real push notifications, deep linking, and token lifecycle management.
