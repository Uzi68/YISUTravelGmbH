<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terminbestätigung - YISU Travel</title>
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
        .appointment-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #003d8e;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 5px 0;
        }
        .detail-label {
            font-weight: bold;
            color: #555;
        }
        .detail-value {
            color: #333;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 14px;
            color: #666;
        }
        .info-box {
            background-color: #e7f3ff;
            border: 1px solid #b3d9ff;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .contact-info {
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
            <h1 class="title">Terminbestätigung</h1>
        </div>

        <div class="content">
            <p>Liebe/r {{ $appointment->customer_name }},</p>
            
            <p>vielen Dank für Ihre Terminbuchung! Wir freuen uns, Sie bald persönlich beraten zu können.</p>
            
            <div class="appointment-details">
                <h3 style="margin-top: 0; color: #003d8e;">Ihre Termindetails:</h3>
                <div class="detail-row">
                    <span class="detail-label">Datum:</span>
                    <span class="detail-value">{{ $appointment->appointment_date->format('d.m.Y') }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Uhrzeit:</span>
                    <span class="detail-value">{{ $appointment->appointment_time->format('H:i') }} Uhr</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Service:</span>
                    <span class="detail-value">{{ $appointment->service_type_label }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value">{{ $appointment->status_label }}</span>
                </div>
                @if($appointment->message)
                <div class="detail-row">
                    <span class="detail-label">Ihre Nachricht:</span>
                    <span class="detail-value">{{ $appointment->message }}</span>
                </div>
                @endif
            </div>

            <div class="info-box">
                <strong>Wichtige Hinweise:</strong>
                <ul>
                    <li>Bitte kommen Sie pünktlich zu Ihrem Termin</li>
                    <li>Falls Sie den Termin verschieben müssen, kontaktieren Sie uns bitte rechtzeitig</li>
                    <li>Bringen Sie alle relevanten Unterlagen mit</li>
                </ul>
            </div>

            <div class="contact-info">
                <strong>Kontakt bei Fragen:</strong><br>
                Telefon: +49 (0) 123 456 789<br>
                E-Mail: info@yisu-travel.de<br>
                Adresse: Musterstraße 123, 12345 Musterstadt
            </div>

            <p>Wir freuen uns auf Ihren Besuch!</p>
            
            <p>Mit freundlichen Grüßen<br>
            Ihr YISU Travel Team</p>
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
