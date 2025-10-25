# Produktions-Konfiguration für YISU Travel

## CORS-Konfiguration
Die CORS-Einstellungen wurden für Ihre Domains konfiguriert:

### Erlaubte Origins:
- `https://yisu-travel.de` (Hauptdomain)
- `https://www.yisu-travel.de` (mit www)
- `http://localhost:4200` (lokale Entwicklung)
- `http://127.0.0.1:4200` (lokale Entwicklung)

## Email-Konfiguration für IONOS Shared Hosting

### Umgebungsvariablen (.env für Produktion):
```env
# App-Konfiguration
APP_NAME="YISU Travel"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://backend.yisu-travel.de
FRONTEND_URL=https://yisu-travel.de

# Datenbank (IONOS MySQL)
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=yisu_travel_prod
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password

# Email-Konfiguration für IONOS
MAIL_MAILER=smtp
MAIL_HOST=smtp.ionos.de
MAIL_PORT=587
MAIL_USERNAME=info@yisu-travel.de
MAIL_PASSWORD=your_email_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="info@yisu-travel.de"
MAIL_FROM_NAME="YISU Travel"
MAIL_ADMIN_EMAIL="info@yisu-travel.de"

# Session-Konfiguration
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=true
SESSION_PATH=/
SESSION_DOMAIN=.yisu-travel.de

# Cache-Konfiguration
CACHE_DRIVER=file
QUEUE_CONNECTION=sync
```

## IONOS-spezifische Einstellungen

### SMTP-Server Details:
- **Host**: `smtp.ionos.de`
- **Port**: `587` (TLS) oder `465` (SSL)
- **Verschlüsselung**: `tls` oder `ssl`
- **Benutzername**: `info@yisu-travel.de`
- **Passwort**: Ihr IONOS Email-Passwort

### Alternative Ports (falls 587 nicht funktioniert):
- Port `25` (unverschlüsselt - nicht empfohlen)
- Port `465` (SSL)
- Port `2525` (alternative TLS)

## Deployment-Checkliste

### 1. Server-Konfiguration:
- [ ] PHP 8.1+ installiert
- [ ] Composer installiert
- [ ] MySQL-Datenbank erstellt
- [ ] Email-Account bei IONOS konfiguriert

### 2. Laravel-Konfiguration:
- [ ] `.env` Datei mit Produktionswerten erstellt
- [ ] `APP_KEY` generiert (`php artisan key:generate`)
- [ ] Datenbank-Migrationen ausgeführt (`php artisan migrate`)
- [ ] Konfiguration gecacht (`php artisan config:cache`)
- [ ] Routes gecacht (`php artisan route:cache`)

### 3. Email-Test:
- [ ] Test-Email von der Anwendung senden
- [ ] SMTP-Verbindung testen
- [ ] Terminbuchung testen (beide Emails prüfen)

### 4. Sicherheit:
- [ ] `APP_DEBUG=false` gesetzt
- [ ] HTTPS aktiviert
- [ ] CORS korrekt konfiguriert
- [ ] Sensible Daten in `.env` (nicht in Git)

## Troubleshooting

### Email-Probleme:
1. **SMTP-Verbindung fehlgeschlagen**: Port und Verschlüsselung prüfen
2. **Authentifizierung fehlgeschlagen**: Benutzername/Passwort prüfen
3. **Emails kommen nicht an**: Spam-Ordner prüfen, SPF/DKIM konfigurieren

### CORS-Probleme:
1. **Frontend kann nicht auf API zugreifen**: CORS-Origins prüfen
2. **Credentials werden nicht übertragen**: `supports_credentials=true` prüfen

## Support-Kontakt:
Bei Problemen mit der IONOS-Konfiguration kontaktieren Sie den IONOS-Support oder prüfen Sie die IONOS-Dokumentation für SMTP-Einstellungen.
