# E-MAIL-KONFIGURATION FÜR LOCALHOST ENTWICKLUNG

## Option 1: Mailtrap (Empfohlen für Tests)
# In deiner .env Datei ändern:
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_mailtrap_username
MAIL_PASSWORD=your_mailtrap_password
MAIL_ENCRYPTION=tls

## Option 2: MailHog (Lokaler SMTP-Server)
# 1. MailHog installieren: https://github.com/mailhog/MailHog
# 2. MailHog starten (läuft auf Port 1025)
# 3. In .env konfigurieren:
MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null

## Option 3: Log-Mailer (Aktuell aktiv)
# E-Mails werden in storage/logs/laravel.log geschrieben
MAIL_MAILER=log

## Option 4: Gmail App-Passwort verwenden
# 1. Google-Konto -> Sicherheit -> App-Passwörter
# 2. Neues App-Passwort generieren
# 3. In .env verwenden:
MAIL_PASSWORD=your_app_password_not_normal_password
