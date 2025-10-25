# Terminbuchung E-Mail-Konfiguration für Produktion

## ✅ Aktuelle Konfiguration
Deine E-Mail-Konfiguration ist korrekt:
- Host: smtp.ionos.de
- Port: 587
- Verschlüsselung: TLS
- Benutzername: info@yisu-travel.de

## 🧪 Schnelltest

### Test 1: E-Mail mit Tinker senden
Öffne Tinker und teste die E-Mail-Funktion:
```bash
php artisan tinker
```

Dann kopiere und füge ein:
```php
use Illuminate\Support\Facades\Mail;
Mail::raw('Test E-Mail', function($message) { 
    $message->to('info@yisu-travel.de')->subject('Test'); 
});
```

Wenn das funktioniert, sollte eine E-Mail angekommen sein.

### Test 2: Logs überprüfen
```bash
tail -f storage/logs/laravel.log
```

Suchen Sie nach:
- ✅ "Customer confirmation email sent successfully"
- ✅ "Admin notification email sent successfully"
- ❌ Oder Fehlermeldungen

### Test 3: Terminbuchung testen
1. Gehen Sie auf Ihrer Website zur Terminbuchung
2. Buchen Sie einen Test-Termin mit Ihrer eigenen E-Mail
3. Überprüfen Sie Ihr Postfach (auch Spam-Ordner!)

## Problem
Die E-Mail-Bestätigungen für Terminbuchungen werden in der Produktion nicht gesendet.

## Lösung - IONOS E-Mail-Konfiguration

### 1. .env Datei konfigurieren
Stellen Sie sicher, dass folgende Einstellungen in Ihrer `.env` Datei im Backend-Verzeichnis vorhanden sind:

```env
# E-Mail-Konfiguration für IONOS
MAIL_MAILER=smtp
MAIL_HOST=smtp.ionos.de
MAIL_PORT=587
MAIL_USERNAME=info@yisu-travel.de
MAIL_PASSWORD=ihr-ionos-passwort
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=info@yisu-travel.de
MAIL_FROM_NAME="YISU Travel"
MAIL_ADMIN_EMAIL=info@yisu-travel.de

# Wichtig für E-Mail-Versand
QUEUE_CONNECTION=sync
```

**Wichtig:** `QUEUE_CONNECTION=sync` bedeutet, dass E-Mails sofort und synchron versendet werden.

### 2. Cache leeren
```bash
cd YISUTravelBackend
php artisan config:cache
php artisan cache:clear
```

### 3. Testen der E-Mail-Konfiguration

#### Test mit Laravel Tinker:
```bash
php artisan tinker
```

Dann in Tinker:
```php
use Illuminate\Support\Facades\Mail;

Mail::raw('Test E-Mail von YISU Travel', function($message) {
    $message->to('info@yisu-travel.de')
            ->subject('Test E-Mail');
});
```

### 4. Testen der Terminbuchung

1. Gehen Sie zur Terminbuchungsseite auf Ihrer Website
2. Füllen Sie alle Felder aus
3. Buchen Sie einen Test-Termin
4. Überprüfen Sie:
   - Das E-Mail-Postfach des Kunden
   - Ihr Admin-Postfach (info@yisu-travel.de)
   - Die Laravel Logs

### 5. Logs überprüfen

```bash
tail -f storage/logs/laravel.log
```

Suchen Sie nach Einträgen wie:
- "Customer confirmation email sent successfully"
- "Admin notification email sent successfully"
- Oder Fehlermeldungen

## Troubleshooting

### E-Mails werden nicht gesendet

#### 1. Überprüfen Sie die .env Datei
- Ist `MAIL_MAILER=smtp` gesetzt?
- Ist `MAIL_HOST=smtp.ionos.de` korrekt?
- Ist das Passwort korrekt?

#### 2. Überprüfen Sie die IONOS E-Mail-Einstellungen
- Login im IONOS Kundencenter
- Gehen Sie zu: E-Mail & Office → E-Mail → E-Mail-Konten
- Überprüfen Sie, dass info@yisu-travel.de aktiv ist
- Stellen Sie sicher, dass das Passwort korrekt ist

#### 3. Testen Sie die SMTP-Verbindung
```bash
php artisan tinker
```

```php
config('mail');
```

Dies sollte die aktuellen E-Mail-Einstellungen anzeigen.

#### 4. Überprüfen Sie die Firewall
- IONOS könnte ausgehende SMTP-Verbindungen blockieren
- Kontaktieren Sie den IONOS Support falls nötig

### Fehlermeldungen in den Logs

#### "Connection refused"
- MAIL_HOST ist falsch (sollte `smtp.ionos.de` sein)
- Port ist falsch (sollte `587` sein)

#### "Authentication failed"
- Passwort ist falsch
- Benutzername ist falsch (sollte die vollständige E-Mail sein)

#### "TLS encryption failed"
- `MAIL_ENCRYPTION=tls` sollte gesetzt sein
- Port 587 sollte verwendet werden

## Alternative: PHP mail() Funktion verwenden

Falls SMTP nicht funktioniert, können Sie die native PHP `mail()` Funktion verwenden:

```env
MAIL_MAILER=sendmail
```

Dies verwendet die Server-Mail-Konfiguration und sollte auf IONOS funktionieren.

## Wichtige Hinweise

1. **QUEUE_CONNECTION=sync** ist wichtig - damit werden E-Mails sofort gesendet
2. Testen Sie immer zuerst mit einem echten E-Mail-Konto
3. Überprüfen Sie auch den Spam-Ordner
4. Bei Problemen: Logs überprüfen und IONOS Support kontaktieren

## Produktions-Checkliste

- [ ] .env Datei ist korrekt konfiguriert
- [ ] IONOS E-Mail-Konto ist aktiv und Passwort ist korrekt
- [ ] Cache wurde geleert (`php artisan config:cache`)
- [ ] Test-E-Mail wurde erfolgreich versendet
- [ ] Terminbuchung wurde getestet
- [ ] E-Mails kommen beim Kunden an
- [ ] E-Mails kommen im Admin-Postfach an
- [ ] Logs zeigen keine Fehler

## Support

Bei weiterhin bestehenden Problemen:
1. Überprüfen Sie die Logs: `storage/logs/laravel.log`
2. Testen Sie die E-Mail-Konfiguration mit Tinker
3. Kontaktieren Sie den IONOS Support
4. Überprüfen Sie, ob andere Laravel E-Mails funktionieren (z.B. Passwort-Reset)
