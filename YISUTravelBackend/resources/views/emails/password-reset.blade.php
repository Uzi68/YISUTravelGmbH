<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Passwort zurücksetzen - YISU Travel</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .email-container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #003d8e;
            margin-bottom: 10px;
        }
        .title {
            font-size: 20px;
            color: #333;
            margin-bottom: 20px;
        }
        .content {
            margin-bottom: 30px;
        }
        .reset-button {
            display: inline-block;
            background-color: #003d8e;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
        }
        .reset-button:hover {
            background-color: #002a63;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 14px;
            color: #666;
        }
        .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">YISU Travel</div>
            <h1 class="title">Passwort zurücksetzen</h1>
        </div>

        <div class="content">
            <p>Hallo,</p>
            
            <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts erhalten. Wenn Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.</p>
            
            <p>Um Ihr Passwort zurückzusetzen, klicken Sie auf den folgenden Button:</p>
            
            <div style="text-align: center;">
                <a href="{{ $resetUrl }}" class="reset-button">Passwort zurücksetzen</a>
            </div>
            
            <p>Oder kopieren Sie diesen Link in Ihren Browser:</p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;">
                {{ $resetUrl }}
            </p>
            
            <div class="warning">
                <strong>Wichtiger Hinweis:</strong> Dieser Link ist nur 60 Minuten gültig. Nach Ablauf dieser Zeit müssen Sie eine neue Passwort-Zurücksetzung anfordern.
            </div>
            
            <p>Falls Sie Probleme beim Zurücksetzen Ihres Passworts haben, wenden Sie sich bitte an unseren Support.</p>
        </div>

        <div class="footer">
            <p><strong>YISU Travel GmbH</strong></p>
            <p>Ihr zuverlässiger Partner für Reisen</p>
            <p>E-Mail: info@yisu-travel.de</p>
            <p>Web: https://yisu-travel.de</p>
        </div>
    </div>
</body>
</html>
