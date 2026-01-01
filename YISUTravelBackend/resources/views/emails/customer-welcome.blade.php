<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Willkommen bei YISU Travel</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #003d8e;
        }
        .title {
            font-size: 22px;
            margin: 10px 0 20px;
            color: #003d8e;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #003d8e;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin-top: 20px;
        }
        .button:hover {
            background-color: #002a63;
        }
        .footer {
            margin-top: 30px;
            font-size: 14px;
            color: #666;
            text-align: center;
            border-top: 1px solid #eee;
            padding-top: 15px;
        }
    </style>
</head>
<body>
<div class="email-container">
    <div class="header">
        <div class="logo">YISU Travel GmbH</div>
        <div class="title">Willkommen bei YISU Travel!</div>
    </div>

    <p>Hallo {{ $user->first_name }},</p>
    <p>vielen Dank für Ihre Registrierung bei YISU Travel GmbH. Wir freuen uns sehr, Sie als Kundin oder Kunden begrüßen zu dürfen.</p>
    <p>Mit Ihrem neuen Konto können Sie Buchungen verwalten, den Chatverlauf einsehen und persönliche Beratungstermine planen.</p>

    <p>Sie können sich jederzeit über den folgenden Link anmelden und Ihr Dashboard aufrufen:</p>
    <p style="text-align: center;">
        <a href="{{ $dashboardUrl }}" class="button">Zum Kunden-Dashboard</a>
    </p>

    <p>Bei Fragen oder Wünschen stehen wir Ihnen gerne unter <a href="mailto:{{ $contactEmail }}">{{ $contactEmail }}</a> zur Verfügung.</p>

    <p>Wir wünschen Ihnen viel Freude bei der Planung Ihrer nächsten Reise!</p>

    <p>Herzliche Grüße<br>
        Ihr Team der YISU Travel GmbH</p>

    <div class="footer">
        <p>YISU Travel GmbH · Schnurstraße 15 · 63450 Hanau</p>
        <p>Web: <a href="https://yisu-travel.de">https://yisu-travel.de</a></p>
    </div>
</div>
</body>
</html>

