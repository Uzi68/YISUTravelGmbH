# Terminbuchung E-Mail-Problem - Troubleshooting Guide

## Das Problem
Der Test-E-Mail-Versand vom Server funktioniert:
```php
Mail::raw('Test E-Mail von YISU Travel', function($message) {
    $message->to('info@yisu-travel.de')->subject('Test E-Mail');
});
```

Aber die E-Mails aus der Terminbuchung werden nicht versendet.

## Mögliche Ursachen

### 1. **Queue-Konfiguration**
Die häufigste Ursache ist, dass E-Mails in eine Queue geschrieben werden, aber kein Queue-Worker läuft.

**Lösung:**
```bash
# .env Datei prüfen
QUEUE_CONNECTION=sync
```

Oder Queue-Worker starten:
```bash
php artisan queue:work
```

### 2. **E-Mail-Konfiguration**
Die E-Mail-Konfiguration ist möglicherweise zwischen Test und Controller unterschiedlich.

**Lösung:**
- Cache leeren: `php artisan config:cache`
- .env prüfen und sicherstellen, dass alle Mail-Einstellungen korrekt sind

### 3. **Fehler in den Logs**
Es gibt möglicherweise Fehler, die nicht angezeigt werden.

**Lösung:**
```bash
tail -f storage/logs/laravel.log
```

### 4. **CORS oder API-Fehler**
Die Frontend-Komponente erreicht möglicherweise die API nicht.

**Lösung:**
- Browser-Konsole öffnen (F12)
- Network-Tab prüfen
- Prüfen, ob die API-Calls erfolgreich sind

## Debugging-Schritte

### Schritt 1: Logs prüfen
```bash
cd YISUTravelBackend
tail -f storage/logs/laravel.log
```

Dann einen Test-Termin buchen und prüfen, ob diese Meldungen erscheinen:
- "Appointment store method called"
- "Attempting to send customer confirmation email"
- "Customer confirmation email sent successfully"
- "Admin notification email sent successfully"

### Schritt 2: Test-E-Mail direkt im Controller senden
Füge vor dem normalen E-Mail-Versand einen Test hinzu:

```php
// Test-E-Mail senden
try {
    Mail::raw('Test vom AppointmentController', function($message) {
        $message->to('info@yisu-travel.de')->subject('Test');
    });
    \Log::info('Test email sent successfully');
} catch (\Exception $e) {
    \Log::error('Test email failed: ' . $e->getMessage());
}
```

### Schritt 3: Mail-Konfiguration prüfen
```bash
php artisan tinker
```

Dann:
```php
config('mail');
```

Dies zeigt alle Mail-Einstellungen an.

### Schritt 4: .env prüfen
Stelle sicher, dass diese Einstellungen korrekt sind:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.ionos.de
MAIL_PORT=587
MAIL_USERNAME=info@yisu-travel.de
MAIL_PASSWORD=ihr-passwort
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=info@yisu-travel.de
MAIL_FROM_NAME="YISU Travel"

QUEUE_CONNECTION=sync
```

### Schritt 5: Cache leeren
```bash
php artisan config:cache
php artisan cache:clear
php artisan config:clear
```

## Häufige Fehler und Lösungen

### Fehler 1: "Connection refused"
**Ursache:** SMTP-Host ist falsch oder Port ist falsch
**Lösung:** 
- MAIL_HOST sollte `smtp.ionos.de` sein
- MAIL_PORT sollte `587` sein

### Fehler 2: "Authentication failed"
**Ursache:** Benutzername oder Passwort ist falsch
**Lösung:**
- MAIL_USERNAME sollte die vollständige E-Mail sein
- Passwort in .env prüfen

### Fehler 3: "TLS encryption failed"
**Ursache:** Verschlüsselungseinstellung ist falsch
**Lösung:**
- MAIL_ENCRYPTION sollte `tls` sein (nicht `ssl`)

### Fehler 4: E-Mails kommen nicht an
**Möglichkeiten:**
- E-Mails landen im Spam-Ordner
- Firewall blockiert SMTP-Verbindungen
- IONOS hat Beschränkungen für ausgehende E-Mails

## Produktions-Checkliste

- [ ] .env Datei ist korrekt konfiguriert
- [ ] QUEUE_CONNECTION=sync (oder Queue-Worker läuft)
- [ ] Cache wurde geleert
- [ ] Logs zeigen keine Fehler
- [ ] Test-E-Mail funktioniert
- [ ] Terminbuchung wurde getestet
- [ ] E-Mails kommen beim Kunden an
- [ ] E-Mails kommen im Admin-Postfach an

## Nächste Schritte

1. **Terminbuchung testen** und gleichzeitig die Logs beobachten
2. **Prüfen**, ob die Log-Zeilen erscheinen, die wir hinzugefügt haben
3. **Bei Fehlern** die komplette Fehlermeldung dokumentieren
4. **Test-E-Mail** vom Controller senden und prüfen, ob diese ankommt

## Support

Wenn nichts davon hilft:
1. Komplette Fehlermeldung aus den Logs kopieren
2. .env Datei (ohne Passwort) teilen
3. Browser-Konsole Screenshot machen
4. Network-Tab Screenshot der API-Calls machen
