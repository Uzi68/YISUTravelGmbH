<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neue Terminbuchung - YISU Travel Admin</title>
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
            border-left: 4px solid #28a745;
        }
        .customer-details {
            background-color: #e7f3ff;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #007bff;
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
        .urgent-box {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .admin-link {
            display: inline-block;
            background-color: #28a745;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 10px 0;
        }
        .admin-link:hover {
            background-color: #218838;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">YISU Travel</div>
            <h1 class="title">Neue Terminbuchung</h1>
        </div>

        <div class="content">
            <p>Hallo Admin-Team,</p>
            
            <p>eine neue Terminbuchung ist eingegangen und wartet auf Ihre Aufmerksamkeit.</p>
            
            <div class="customer-details">
                <h3 style="margin-top: 0; color: #007bff;">Kundendaten:</h3>
                <div class="detail-row">
                    <span class="detail-label">Name:</span>
                    <span class="detail-value">{{ $appointment->customer_name }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">E-Mail:</span>
                    <span class="detail-value">{{ $appointment->customer_email }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Telefon:</span>
                    <span class="detail-value">{{ $appointment->customer_phone }}</span>
                </div>
            </div>

            <div class="appointment-details">
                <h3 style="margin-top: 0; color: #28a745;">Termindetails:</h3>
                <div class="detail-row">
                    <span class="detail-label">Datum:</span>
                    <span class="detail-value">{{ \Carbon\Carbon::parse($appointment->appointment_date)->format('d.m.Y') }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Uhrzeit:</span>
                    <span class="detail-value">{{ $appointment->appointment_time }} Uhr</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Service:</span>
                    <span class="detail-value">{{ $appointment->service_type_label }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value">{{ $appointment->status_label }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Buchungszeit:</span>
                    <span class="detail-value">{{ $appointment->created_at->format('d.m.Y H:i') }} Uhr</span>
                </div>
                @if($appointment->message)
                <div class="detail-row">
                    <span class="detail-label">Kundennachricht:</span>
                    <span class="detail-value">{{ $appointment->message }}</span>
                </div>
                @endif
            </div>

            <div class="urgent-box">
                <strong>Nächste Schritte:</strong>
                <ul>
                    <li>Termin im Admin-Panel überprüfen</li>
                    <li>Bei Bedarf Termin bestätigen oder verschieben</li>
                    <li>Kunde kontaktieren falls weitere Informationen benötigt werden</li>
                    <li>Vorbereitung für den Termin treffen</li>
                </ul>
            </div>

            <div style="text-align: center;">
                <a href="{{ config('app.frontend_url') }}/admin/appointments" class="admin-link">
                    Admin-Panel öffnen
                </a>
            </div>

            <p>Bitte bearbeiten Sie diese Terminbuchung zeitnah.</p>
        </div>

        <div class="footer">
            <p><strong>YISU Travel GmbH</strong></p>
            <p>Admin-Benachrichtigung</p>
            <p>E-Mail: info@yisu-travel.de</p>
            <p>Web: https://yisu-travel.de</p>
        </div>
    </div>
</body>
</html>
