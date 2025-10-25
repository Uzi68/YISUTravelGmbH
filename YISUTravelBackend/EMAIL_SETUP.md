# E-Mail-Konfiguration für YISU Travel

## Übersicht
Das System unterstützt jetzt vollständige E-Mail-Funktionalität für Passwort-Reset-Links.

## Konfiguration

### 1. .env-Datei konfigurieren
Erstellen Sie eine `.env`-Datei im Backend-Verzeichnis mit folgenden E-Mail-Einstellungen:

```env
# E-Mail-Konfiguration
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=ihre-email@gmail.com
MAIL_PASSWORD=ihr-app-passwort
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="info@yisu-travel.de"
MAIL_FROM_NAME="YISU Travel"

# Frontend URL für Reset-Links
FRONTEND_URL=http://localhost:4200
```

### 2. Gmail-Konfiguration (Empfohlen)

#### Schritt 1: App-Passwort erstellen
1. Gehen Sie zu Ihrem Google-Konto
2. Sicherheit → 2-Schritt-Verifizierung aktivieren
3. App-Passwörter → App-Passwort erstellen
4. Verwenden Sie dieses Passwort in der .env-Datei

#### Schritt 2: E-Mail-Einstellungen
```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=ihre-gmail-adresse@gmail.com
MAIL_PASSWORD=ihr-16-stelliges-app-passwort
MAIL_ENCRYPTION=tls
```

### 3. Alternative E-Mail-Anbieter

#### Outlook/Hotmail
```env
MAIL_HOST=smtp-mail.outlook.com
MAIL_PORT=587
MAIL_USERNAME=ihre-outlook-adresse@outlook.com
MAIL_PASSWORD=ihr-passwort
MAIL_ENCRYPTION=tls
```

#### Yahoo
```env
MAIL_HOST=smtp.mail.yahoo.com
MAIL_PORT=587
MAIL_USERNAME=ihre-yahoo-adresse@yahoo.com
MAIL_PASSWORD=ihr-app-passwort
MAIL_ENCRYPTION=tls
```

## Funktionen

### Passwort-Reset per E-Mail
- ✅ Benutzer können Passwort-Reset anfordern
- ✅ E-Mail mit Reset-Link wird gesendet
- ✅ Professionelles E-Mail-Template
- ✅ Token-basierte Sicherheit (60 Minuten gültig)
- ✅ Deutsche Lokalisierung

### E-Mail-Template
Das System verwendet ein professionelles HTML-E-Mail-Template mit:
- YISU Travel Branding
- Responsive Design
- Sicherheitshinweise
- Direkter Reset-Button
- Fallback-Link

## Testen

### 1. E-Mail-Funktionalität testen
```bash
# Backend starten
cd YISUTravelBackend
php artisan serve

# Test-E-Mail senden
curl -X POST http://localhost:8000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "ihre-test-email@example.com"}'
```

### 2. Passwort-Reset testen
1. Gehen Sie zu `/password-reset`
2. Geben Sie eine gültige E-Mail-Adresse ein
3. Überprüfen Sie Ihr E-Mail-Postfach
4. Klicken Sie auf den Reset-Link
5. Setzen Sie ein neues Passwort

## Sicherheit

### Token-Sicherheit
- Reset-Token sind 60 Minuten gültig
- Token werden nach Verwendung ungültig
- Rate-Limiting verhindert Missbrauch

### E-Mail-Sicherheit
- TLS-Verschlüsselung für alle E-Mails
- Keine sensiblen Daten in E-Mails
- Sichere Token-Generierung

## Troubleshooting

### Häufige Probleme

#### 1. E-Mail wird nicht gesendet
```bash
# Logs überprüfen
tail -f storage/logs/laravel.log

# E-Mail-Konfiguration testen
php artisan tinker
>>> Mail::raw('Test', function($msg) { $msg->to('test@example.com'); });
```

#### 2. Gmail-Authentifizierung fehlgeschlagen
- 2-Schritt-Verifizierung aktivieren
- App-Passwort verwenden (nicht Hauptpasswort)
- "Weniger sichere Apps" aktivieren (nicht empfohlen)

#### 3. Frontend-Links funktionieren nicht
- `FRONTEND_URL` in .env korrekt setzen
- CORS-Einstellungen überprüfen
- Angular-Server läuft auf korrektem Port

### Debug-Modus
```env
APP_DEBUG=true
LOG_LEVEL=debug
MAIL_LOG_CHANNEL=stack
```

## Produktions-Deployment

### 1. E-Mail-Service wählen
- **Empfohlen**: SendGrid, Mailgun, oder AWS SES
- **Kostenlos**: Gmail (begrenzt auf 500 E-Mails/Tag)

### 2. Umgebungsvariablen setzen
```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=ihr-sendgrid-api-key
MAIL_ENCRYPTION=tls
```

### 3. Test-E-Mail-Route entfernen
Entfernen Sie die `/test-email` Route aus `routes/api.php` vor dem Produktions-Deployment.

## Support

Bei Problemen mit der E-Mail-Konfiguration:
1. Überprüfen Sie die Logs: `storage/logs/laravel.log`
2. Testen Sie die E-Mail-Konfiguration mit `php artisan tinker`
3. Überprüfen Sie die .env-Datei auf korrekte Einstellungen
4. Stellen Sie sicher, dass der E-Mail-Server erreichbar ist
