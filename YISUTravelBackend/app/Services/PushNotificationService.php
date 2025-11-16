<?php

namespace App\Services;

use App\Models\Chat;
use App\Models\Message;
use App\Models\PushSubscription;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PushNotificationService
{
    private const GOOGLE_TOKEN_URI = 'https://oauth2.googleapis.com/token';
    private const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
    private const MESSAGE_ENDPOINT = 'https://fcm.googleapis.com/v1/projects/yisu-travel-gmbh/messages:send';

    private ?array $credentials = null;
    private ?string $projectId = null;
    private ?string $accessToken = null;
    private ?int $tokenExpiresAt = null;

    public function __construct()
    {
        $this->credentials = $this->loadCredentials();
        $this->projectId = config('services.fcm.project_id')
            ?? $this->credentials['project_id']
            ?? null;
    }

    public function notifyStaffAboutChatMessage(Chat $chat, Message $message): void
    {
        Log::info('PushNotificationService invoked', [
            'chat_id' => $chat->id,
            'message_id' => $message->id ?? null,
            'enabled' => $this->isEnabled(),
            'message_from' => $message->from ?? null,
        ]);

        if (!$this->isEnabled() || !$message || $message->from === 'agent') {
            Log::info('PushNotificationService aborted', [
                'chat_id' => $chat->id,
                'message_id' => $message->id ?? null,
            ]);
            return;
        }

        $recipients = $this->resolveRecipients($chat);
        Log::info('PushNotificationService resolved recipients', [
            'chat_id' => $chat->id,
            'recipient_count' => $recipients->count(),
            'assigned_to' => $chat->assigned_to,
        ]);

        if ($recipients->isEmpty()) {
            Log::warning('PushNotificationService has no recipients', [
                'chat_id' => $chat->id,
                'assigned_to' => $chat->assigned_to,
            ]);
            return;
        }

        $payload = $this->buildPayload($chat, $message);
        $this->dispatchToRecipients($recipients, $payload);
    }

    private function resolveRecipients(Chat $chat): Collection
    {
        if ($chat->assigned_to) {
            return PushSubscription::active()
                ->where('user_id', $chat->assigned_to)
                ->get();
        }

        return PushSubscription::active()
            ->whereHas('user', function ($query) {
                $query->whereHas('roles', function ($roleQuery) {
                    $roleQuery->whereIn('name', ['Admin', 'Agent']);
                });
            })
            ->get();
    }

    private function buildPayload(Chat $chat, $message): array
    {
        $visitorName = trim(($chat->visitor->first_name ?? '') . ' ' . ($chat->visitor->last_name ?? ''));
        $title = $visitorName !== '' ? $visitorName : 'Neuer Besucher im Chat';

        $body = Str::limit($message->text ?? 'Neue Nachricht', 120);

        return [
            'notification' => [
                'title' => $title,
                'body' => $body,
            ],
            'android' => [
                'notification' => [
                    'sound' => 'default',
                    'channel_id' => 'chat-messages',
                ],
            ],
            'apns' => [
                'payload' => [
                    'aps' => [
                        'sound' => 'default',
                    ],
                ],
            ],
            'data' => [
                'chat_id' => (string) $chat->id,
                'session_id' => (string) $chat->session_id,
                'message_id' => (string) ($message->id ?? ''),
                'type' => 'chat_message',
            ],
        ];
    }

    private function dispatchToRecipients(Collection $recipients, array $payload): void
    {
        $endpoint = sprintf(self::MESSAGE_ENDPOINT, $this->projectId);
        $token = $this->getAccessToken();
        if (!$token) {
            Log::error('FCM access token missing, abort push dispatch.');
            return;
        }

        $recipients->each(function (PushSubscription $subscription) use ($payload, $endpoint, $token) {
            if (!$subscription->token) {
                return;
            }

            Log::info('Dispatching push to subscription', [
                'subscription_id' => $subscription->id,
                'user_id' => $subscription->user_id,
            ]);

            $response = Http::withToken($token)
                ->post($endpoint, [
                    'message' => [
                        'token' => $subscription->token,
                        'notification' => $payload['notification'],
                        'android' => $payload['android'] ?? null,
                        'apns' => $payload['apns'] ?? null,
                        'data' => $this->stringifyDataPayload($payload['data']),
                    ],
                ]);

            if ($response->failed()) {
                $error = $response->json('error.status');
                Log::warning('FCM notification failed', [
                    'token' => $subscription->token,
                    'status' => $response->status(),
                    'error' => $error,
                    'body' => $response->body(),
                ]);

                if ($error === 'UNREGISTERED' || $error === 'INVALID_ARGUMENT') {
                    $subscription->update(['is_active' => false]);
                }
                return;
            }

            Log::info('FCM notification dispatched', [
                'subscription_id' => $subscription->id,
                'user_id' => $subscription->user_id,
            ]);

            $subscription->update([
                'last_seen_at' => now(),
                'last_notified_at' => now(),
                'is_active' => true,
            ]);
        });
    }

    private function stringifyDataPayload(array $data): array
    {
        return collect($data)
            ->filter(fn ($value) => $value !== null)
            ->map(fn ($value) => (string) $value)
            ->all();
    }

    private function getAccessToken(): ?string
    {
        $now = time();
        if ($this->accessToken && $this->tokenExpiresAt && $this->tokenExpiresAt - 60 > $now) {
            return $this->accessToken;
        }

        return $this->requestAccessToken();
    }

    private function requestAccessToken(): ?string
    {
        if (!$this->credentials) {
            return null;
        }

        $clientEmail = $this->credentials['client_email'] ?? null;
        $privateKey = $this->credentials['private_key'] ?? null;
        $tokenUri = $this->credentials['token_uri'] ?? self::GOOGLE_TOKEN_URI;

        if (!$clientEmail || !$privateKey) {
            return null;
        }

        $privateKey = $this->normalizePrivateKey($privateKey);
        $now = time();

        $jwtHeader = $this->base64UrlEncode(json_encode([
            'alg' => 'RS256',
            'typ' => 'JWT',
        ], JSON_THROW_ON_ERROR));

        $jwtClaim = $this->base64UrlEncode(json_encode([
            'iss' => $clientEmail,
            'scope' => self::GOOGLE_SCOPE,
            'aud' => $tokenUri,
            'iat' => $now,
            'exp' => $now + 3600,
        ], JSON_THROW_ON_ERROR));

        $unsignedJwt = $jwtHeader . '.' . $jwtClaim;
        $signature = '';

        if (!openssl_sign($unsignedJwt, $signature, $privateKey, 'sha256WithRSAEncryption')) {
            Log::error('Unable to sign FCM JWT.');
            return null;
        }

        $assertion = $unsignedJwt . '.' . $this->base64UrlEncode($signature);

        $response = Http::asForm()
            ->post($tokenUri, [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $assertion,
            ]);

        if ($response->failed()) {
            Log::error('Failed to fetch FCM access token', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return null;
        }

        $this->accessToken = $response->json('access_token');
        $this->tokenExpiresAt = $now + (int) $response->json('expires_in', 0);

        return $this->accessToken;
    }

    private function normalizePrivateKey(string $key): string
    {
        if (str_contains($key, '\n')) {
            $key = str_replace('\n', PHP_EOL, $key);
        }

        return $key;
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function loadCredentials(): ?array
    {
        $path = config('services.fcm.credentials_file');
        if ($path) {
            $absolutePath = $this->resolveCredentialPath($path);
            if ($absolutePath && file_exists($absolutePath)) {
                $contents = file_get_contents($absolutePath);
                if ($contents !== false) {
                    $decoded = json_decode($contents, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        Log::info('FCM credentials loaded', ['path' => $absolutePath]);
                        return $decoded;
                    }
                }
            } else {
                Log::warning('FCM credentials file not found', ['configured_path' => $path]);
            }
        }

        $clientEmail = config('services.fcm.client_email');
        $privateKey = config('services.fcm.private_key');
        if ($clientEmail && $privateKey) {
            return [
                'client_email' => $clientEmail,
                'private_key' => $privateKey,
                'token_uri' => self::GOOGLE_TOKEN_URI,
                'project_id' => config('services.fcm.project_id'),
            ];
        }

        return null;
    }

    private function resolveCredentialPath(string $path): ?string
    {
        if (str_starts_with($path, '/')) {
            return $path;
        }

        $storagePath = storage_path($path);
        if (file_exists($storagePath)) {
            return $storagePath;
        }

        $basePath = base_path($path);
        if (file_exists($basePath)) {
            return $basePath;
        }

        return base_path($path);
    }

    private function isEnabled(): bool
    {
        return (bool) config('services.fcm.enabled', false)
            && $this->projectId
            && $this->credentials;
    }
}
