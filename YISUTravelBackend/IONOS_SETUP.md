# IONOS-Konfiguration für YISU Travel Terminbuchung

## ✅ Einheitliche Laravel-Lösung

Die Terminbuchung wurde für IONOS optimiert und verwendet jetzt eine einheitliche Laravel-Struktur ohne separate PHP-Dateien.

## 🔧 Konfiguration für IONOS

### 1. .env Datei erstellen

Erstellen Sie eine `.env` Datei im Backend-Verzeichnis mit folgenden Inhalten:

```env
APP_NAME="YISU Travel"
APP_ENV=production
APP_KEY=base64:your-app-key-here
APP_DEBUG=false
APP_URL=https://yisu-travel.de

# Database Configuration for IONOS
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USERNAME=your_database_username
DB_PASSWORD=your_database_password

# Mail Configuration for IONOS (using sendmail)
MAIL_MAILER=sendmail
MAIL_HOST=smtp.ionos.de
MAIL_PORT=587
MAIL_USERNAME=info@yisu-travel.de
MAIL_PASSWORD=your_email_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=info@yisu-travel.de
MAIL_FROM_NAME="YISU Travel"
MAIL_ADMIN_EMAIL=info@yisu-travel.de
```

### 2. Datenbank einrichten

1. Loggen Sie sich in IONOS ein
2. Gehen Sie zu phpMyAdmin
3. Erstellen Sie eine neue MySQL-Datenbank
4. Führen Sie die Laravel-Migrationen aus:
   ```bash
   php artisan migrate
   ```

### 3. App Key generieren

```bash
php artisan key:generate
```

### 4. Cache leeren

```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```

## 📧 Email-System

Das System verwendet jetzt eine IONOS-kompatible Mail-Klasse (`IonosCompatibleMail`), die:

- ✅ Die einfache PHP `mail()` Funktion verwendet
- ✅ Mit IONOS-Servern kompatibel ist
- ✅ HTML-Emails mit schönem Design sendet
- ✅ Sowohl Admin-Benachrichtigungen als auch Kunden-Bestätigungen versendet

## 🗄️ Datenbankstruktur

Die bestehenden Migrationen sind bereits korrekt konfiguriert:

- `appointments` Tabelle für Terminbuchungen
- `blocked_slots` Tabelle für Admin-Sperrungen
- Alle notwendigen Indizes und Constraints

## 🚀 Deployment

1. Laden Sie das Backend auf IONOS hoch
2. Konfigurieren Sie die `.env` Datei
3. Führen Sie `php artisan migrate` aus
4. Testen Sie die Terminbuchung

## 🔍 Vorteile der einheitlichen Lösung

- ✅ Keine separaten PHP-Dateien
- ✅ Einheitliche Laravel-Struktur
- ✅ Verwendet bestehende Migrationen
- ✅ IONOS-kompatible Email-Funktionalität
- ✅ Einfache Wartung und Erweiterung
- ✅ Konsistente API-Struktur

## 📝 API-Endpunkte

- `POST /api/appointments` - Neuen Termin erstellen
- `GET /api/appointments/available-slots?date=YYYY-MM-DD` - Verfügbare Zeitslots abrufen
- `GET /api/appointments` - Alle Termine abrufen (Admin)
- `PATCH /api/appointments/{id}/status` - Termin-Status ändern (Admin)

Die Lösung ist jetzt vollständig einheitlich und IONOS-kompatibel!
