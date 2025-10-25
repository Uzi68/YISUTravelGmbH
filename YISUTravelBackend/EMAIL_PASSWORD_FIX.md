# Email-Passwort Problem mit # Zeichen lösen

## Problem:
Das `#` Zeichen in Ihrem Email-Passwort wird von Laravel als Kommentar interpretiert.

## Lösungen:

### Lösung 1: Passwort in Anführungszeichen setzen
```env
MAIL_PASSWORD="....rkish#."
```

### Lösung 2: Passwort ohne Anführungszeichen (falls es funktioniert)
```env
MAIL_PASSWORD=....rkish#.
```

### Lösung 3: Passwort mit einfachen Anführungszeichen
```env
MAIL_PASSWORD='....rkish#.'
```

### Lösung 4: Passwort escapen (falls andere Zeichen Probleme machen)
```env
MAIL_PASSWORD="....rkish\#."
```

## Empfohlene .env Konfiguration für IONOS:

```env
# App-Konfiguration
APP_NAME="YISU Travel"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://backend.yisu-travel.de
FRONTEND_URL=https://yisu-travel.de

# Email-Konfiguration für IONOS
MAIL_MAILER=smtp
MAIL_HOST=smtp.ionos.de
MAIL_PORT=587
MAIL_USERNAME=info@yisu-travel.de
MAIL_PASSWORD="....rkish#."
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="info@yisu-travel.de"
MAIL_FROM_NAME="YISU Travel"
MAIL_ADMIN_EMAIL="info@yisu-travel.de"
```

## Testen der Konfiguration:

Nach dem Setzen der .env Datei:
```bash
php artisan config:cache
php artisan config:clear
```

## Troubleshooting:

1. **Falls es immer noch nicht funktioniert:**
   - Überprüfen Sie, ob das Passwort korrekt ist
   - Testen Sie mit einem einfacheren Passwort ohne Sonderzeichen
   - Kontaktieren Sie IONOS-Support für SMTP-Einstellungen

2. **Alternative IONOS SMTP-Einstellungen:**
   ```env
   MAIL_PORT=465
   MAIL_ENCRYPTION=ssl
   ```
   oder
   ```env
   MAIL_PORT=25
   MAIL_ENCRYPTION=null
   ```
