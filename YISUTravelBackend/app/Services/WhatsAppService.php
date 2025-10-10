<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class WhatsAppService
{
    private string $apiUrl;
    private string $phoneNumberId;
    private string $accessToken;
    private string $apiVersion;

    public function __construct()
    {
        $this->apiUrl = config('services.whatsapp.api_url', 'https://graph.facebook.com');
        $this->phoneNumberId = config('services.whatsapp.phone_number_id');
        $this->accessToken = config('services.whatsapp.access_token');
        $this->apiVersion = config('services.whatsapp.api_version', 'v22.0');
    }

    /**
     * Sende Text-Nachricht über WhatsApp
     */
    public function sendTextMessage(string $to, string $message, ?string $previewUrl = null): array
    {
        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $this->formatPhoneNumber($to),
            'type' => 'text',
            'text' => [
                'body' => $message,
            ]
        ];

        if ($previewUrl !== null) {
            $payload['text']['preview_url'] = $previewUrl === 'true' || $previewUrl === true;
        }

        return $this->sendRequest($payload);
    }

    /**
     * Sende Template-Nachricht (z.B. hello_world)
     */
    public function sendTemplate(string $to, string $templateName, string $languageCode = 'en_US', array $components = []): array
    {
        $payload = [
            'messaging_product' => 'whatsapp',
            'to' => $this->formatPhoneNumber($to),
            'type' => 'template',
            'template' => [
                'name' => $templateName,
                'language' => [
                    'code' => $languageCode
                ]
            ]
        ];

        if (!empty($components)) {
            $payload['template']['components'] = $components;
        }

        return $this->sendRequest($payload);
    }

    /**
     * Sende Bild über WhatsApp
     */
    public function sendImage(string $to, string $imageUrl, ?string $caption = null): array
    {
        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $this->formatPhoneNumber($to),
            'type' => 'image',
            'image' => [
                'link' => $imageUrl
            ]
        ];

        if ($caption) {
            $payload['image']['caption'] = $caption;
        }

        return $this->sendRequest($payload);
    }

    /**
     * Sende Bild via Media ID (bereits hochgeladen)
     */
    public function sendImageById(string $to, string $mediaId, ?string $caption = null): array
    {
        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $this->formatPhoneNumber($to),
            'type' => 'image',
            'image' => [
                'id' => $mediaId
            ]
        ];

        if ($caption) {
            $payload['image']['caption'] = $caption;
        }

        return $this->sendRequest($payload);
    }

    /**
     * Sende Dokument (PDF, DOCX, etc.)
     */
    public function sendDocument(string $to, string $documentUrl, ?string $caption = null, ?string $filename = null): array
    {
        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $this->formatPhoneNumber($to),
            'type' => 'document',
            'document' => [
                'link' => $documentUrl
            ]
        ];

        if ($caption) {
            $payload['document']['caption'] = $caption;
        }

        if ($filename) {
            $payload['document']['filename'] = $filename;
        }

        return $this->sendRequest($payload);
    }

    /**
     * Sende Dokument via Media ID
     */
    public function sendDocumentById(string $to, string $mediaId, ?string $caption = null, ?string $filename = null): array
    {
        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $this->formatPhoneNumber($to),
            'type' => 'document',
            'document' => [
                'id' => $mediaId
            ]
        ];

        if ($caption) {
            $payload['document']['caption'] = $caption;
        }

        if ($filename) {
            $payload['document']['filename'] = $filename;
        }

        return $this->sendRequest($payload);
    }

    /**
     * Sende Video
     */
    public function sendVideo(string $to, string $videoUrl, ?string $caption = null): array
    {
        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $this->formatPhoneNumber($to),
            'type' => 'video',
            'video' => [
                'link' => $videoUrl
            ]
        ];

        if ($caption) {
            $payload['video']['caption'] = $caption;
        }

        return $this->sendRequest($payload);
    }

    /**
     * Sende Video via Media ID
     */
    public function sendVideoById(string $to, string $mediaId, ?string $caption = null): array
    {
        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $this->formatPhoneNumber($to),
            'type' => 'video',
            'video' => [
                'id' => $mediaId
            ]
        ];

        if ($caption) {
            $payload['video']['caption'] = $caption;
        }

        return $this->sendRequest($payload);
    }

    /**
     * Sende Audio
     */
    public function sendAudio(string $to, string $audioUrl): array
    {
        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $this->formatPhoneNumber($to),
            'type' => 'audio',
            'audio' => [
                'link' => $audioUrl
            ]
        ];

        return $this->sendRequest($payload);
    }

    /**
     * Sende Location
     */
    public function sendLocation(string $to, float $latitude, float $longitude, string $name, string $address): array
    {
        $payload = [
            'messaging_product' => 'whatsapp',
            'to' => $this->formatPhoneNumber($to),
            'type' => 'location',
            'location' => [
                'latitude' => $latitude,
                'longitude' => $longitude,
                'name' => $name,
                'address' => $address
            ]
        ];

        return $this->sendRequest($payload);
    }

    /**
     * Sende Contact
     */
    public function sendContact(string $to, array $contacts): array
    {
        $payload = [
            'messaging_product' => 'whatsapp',
            'to' => $this->formatPhoneNumber($to),
            'type' => 'contacts',
            'contacts' => $contacts
        ];

        return $this->sendRequest($payload);
    }

    /**
     * Sende Interactive Buttons
     */
    public function sendInteractiveButtons(string $to, string $bodyText, array $buttons, ?string $headerText = null, ?string $footerText = null): array
    {
        $interactive = [
            'type' => 'button',
            'body' => [
                'text' => $bodyText
            ],
            'action' => [
                'buttons' => $buttons
            ]
        ];

        if ($headerText) {
            $interactive['header'] = [
                'type' => 'text',
                'text' => $headerText
            ];
        }

        if ($footerText) {
            $interactive['footer'] = [
                'text' => $footerText
            ];
        }

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $this->formatPhoneNumber($to),
            'type' => 'interactive',
            'interactive' => $interactive
        ];

        return $this->sendRequest($payload);
    }

    /**
     * Sende Interactive List
     */
    public function sendInteractiveList(string $to, string $bodyText, string $buttonText, array $sections, ?string $headerText = null, ?string $footerText = null): array
    {
        $interactive = [
            'type' => 'list',
            'body' => [
                'text' => $bodyText
            ],
            'action' => [
                'button' => $buttonText,
                'sections' => $sections
            ]
        ];

        if ($headerText) {
            $interactive['header'] = [
                'type' => 'text',
                'text' => $headerText
            ];
        }

        if ($footerText) {
            $interactive['footer'] = [
                'text' => $footerText
            ];
        }

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $this->formatPhoneNumber($to),
            'type' => 'interactive',
            'interactive' => $interactive
        ];

        return $this->sendRequest($payload);
    }

    /**
     * Lade Media hoch und erhalte Media-ID
     */
    public function uploadMedia(string $filePath, string $mimeType): array
    {
        $url = "{$this->apiUrl}/{$this->apiVersion}/{$this->phoneNumberId}/media";

        try {
            $response = Http::withToken($this->accessToken)
                ->attach('file', file_get_contents($filePath), basename($filePath))
                ->post($url, [
                    'messaging_product' => 'whatsapp',
                    'type' => $mimeType
                ]);

            $result = $response->json();

            Log::info('WhatsApp Media Upload Response', [
                'status' => $response->status(),
                'response' => $result
            ]);

            return [
                'success' => $response->successful(),
                'data' => $result,
                'media_id' => $result['id'] ?? null
            ];

        } catch (\Exception $e) {
            Log::error('WhatsApp Media Upload Error', [
                'error' => $e->getMessage(),
                'file' => $filePath
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Lade Media-URL von WhatsApp herunter
     */
    public function downloadMedia(string $mediaId): array
    {
        $url = "{$this->apiUrl}/{$this->apiVersion}/{$mediaId}";

        try {
            // Schritt 1: Media-URL abrufen
            $response = Http::withToken($this->accessToken)->get($url);

            if (!$response->successful()) {
                throw new \Exception('Failed to get media URL');
            }

            $mediaData = $response->json();
            $mediaUrl = $mediaData['url'] ?? null;

            if (!$mediaUrl) {
                throw new \Exception('Media URL not found');
            }

            // Schritt 2: Media herunterladen
            $mediaResponse = Http::withToken($this->accessToken)->get($mediaUrl);

            if (!$mediaResponse->successful()) {
                throw new \Exception('Failed to download media');
            }

            return [
                'success' => true,
                'data' => $mediaResponse->body(),
                'mime_type' => $mediaData['mime_type'] ?? 'application/octet-stream',
                'file_size' => $mediaData['file_size'] ?? null,
                'sha256' => $mediaData['sha256'] ?? null
            ];

        } catch (\Exception $e) {
            Log::error('WhatsApp Media Download Error', [
                'media_id' => $mediaId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Markiere Nachricht als gelesen
     */
    public function markAsRead(string $messageId): array
    {
        $payload = [
            'messaging_product' => 'whatsapp',
            'status' => 'read',
            'message_id' => $messageId
        ];

        return $this->sendRequest($payload);
    }

    /**
     * Haupt-Request-Methode
     */
    private function sendRequest(array $payload): array
    {
        $url = "{$this->apiUrl}/{$this->apiVersion}/{$this->phoneNumberId}/messages";

        try {
            $response = Http::withToken($this->accessToken)
                ->post($url, $payload);

            $result = $response->json();

            Log::info('WhatsApp API Request', [
                'url' => $url,
                'payload' => $payload,
                'status' => $response->status(),
                'response' => $result
            ]);

            return [
                'success' => $response->successful(),
                'data' => $result,
                'message_id' => $result['messages'][0]['id'] ?? null,
                'status' => $response->status()
            ];

        } catch (\Exception $e) {
            Log::error('WhatsApp API Error', [
                'payload' => $payload,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Formatiere Telefonnummer (entferne +, Leerzeichen, etc.)
     */
    private function formatPhoneNumber(string $phoneNumber): string
    {
        // Entferne alle Nicht-Ziffern außer dem führenden +
        $cleaned = preg_replace('/[^\d+]/', '', $phoneNumber);

        // Entferne führendes + falls vorhanden
        return ltrim($cleaned, '+');
    }

    /**
     * Verifiziere Webhook-Signature
     */
    public function verifyWebhookSignature(string $payload, string $signature): bool
    {
        $appSecret = config('services.whatsapp.app_secret');
        $expectedSignature = 'sha256=' . hash_hmac('sha256', $payload, $appSecret);

        return hash_equals($expectedSignature, $signature);
    }
}
