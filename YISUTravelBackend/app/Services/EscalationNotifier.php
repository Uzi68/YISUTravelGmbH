<?php

namespace App\Services;

use App\Models\Chat;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class EscalationNotifier
{
    private const ALLOWED_REASONS = [
        'missing_knowledge',
        'frustration',
        'irony',
        'insufficient_info',
        'risk_uncertainty',
        'repetition',
        'user_request',
        'other',
        'none'
    ];

    private const REASON_ALIASES = [
        'missing_info' => 'insufficient_info',
        'missing_information' => 'insufficient_info',
        'insufficient_information' => 'insufficient_info',
        'risk' => 'risk_uncertainty',
        'uncertainty' => 'risk_uncertainty',
        'anger' => 'frustration',
        'frustration_or_anger' => 'frustration',
        'repeat' => 'repetition'
    ];

    public function notify(Chat $chat, string $input, string $reason): void
    {
        $normalizedReason = $this->normalizeReason($reason);
        if ($normalizedReason === 'none') {
            return;
        }

        if (!$this->shouldNotifyEscalation($chat, $normalizedReason)) {
            return;
        }

        $chat->loadMissing(['user', 'visitor']);

        $to = (string) config('services.openai.knowledge_missing_to', 'info@yisu-travel.de');
        if (trim($to) === '') {
            return;
        }

        $subject = $this->buildSubject($normalizedReason);
        $reasonLine = $this->buildReasonLine($normalizedReason);

        $user = $chat->user;
        $visitor = $chat->visitor;
        $name = trim((string) ($user?->name ?? ''));
        if ($name === '') {
            $name = trim((string) (($visitor?->first_name ?? '') . ' ' . ($visitor?->last_name ?? '')));
        }

        $email = (string) ($user?->email ?? $visitor?->email ?? '');
        $phone = (string) ($user?->phone ?? $visitor?->phone ?? '');
        $frontendUrl = rtrim((string) config('app.frontend_url'), '/');
        $adminLink = $frontendUrl . '/admin-dashboard?chatId=' . $chat->session_id;

        $body = $reasonLine . "\n\n"
            . "Nachricht: {$input}\n"
            . "Chat-ID: {$chat->id}\n"
            . "Session-ID: {$chat->session_id}\n"
            . "Channel: " . ($chat->channel ?? 'unbekannt') . "\n"
            . "Name: " . ($name !== '' ? $name : 'Unbekannt') . "\n"
            . "E-Mail: " . ($email !== '' ? $email : 'Unbekannt') . "\n"
            . "Telefon: " . ($phone !== '' ? $phone : 'Unbekannt') . "\n"
            . "Admin-Link: {$adminLink}\n"
            . "Zeit: " . now()->toDateTimeString() . "\n";

        try {
            Mail::raw($body, function ($message) use ($to, $subject) {
                $message->to($to)->subject($subject);
            });
        } catch (\Throwable $e) {
            Log::warning('Escalation email failed', ['error' => $e->getMessage()]);
            return;
        }

        $this->markEscalationNotified($chat, $normalizedReason);
    }

    private function normalizeReason(string $reason): string
    {
        $normalized = strtolower(trim($reason));
        if ($normalized === '' || $normalized === 'none') {
            return 'none';
        }

        if (array_key_exists($normalized, self::REASON_ALIASES)) {
            $normalized = self::REASON_ALIASES[$normalized];
        }

        return in_array($normalized, self::ALLOWED_REASONS, true) ? $normalized : 'other';
    }

    private function buildSubject(string $reason): string
    {
        if ($reason === 'missing_knowledge') {
            return (string) config(
                'services.openai.knowledge_missing_subject',
                'Neue Chatbot-Anfrage ohne Wissenseintrag'
            );
        }

        $subjectMap = [
            'frustration' => 'Chatbot-Eskalation (Frustration)',
            'irony' => 'Chatbot-Eskalation (Ironie)',
            'insufficient_info' => 'Chatbot-Eskalation (Fehlende Angaben)',
            'risk_uncertainty' => 'Chatbot-Eskalation (Unsicherheit/Risiko)',
            'repetition' => 'Chatbot-Eskalation (Wiederholung)',
            'user_request' => 'Chatbot-Eskalation (Mitarbeiter gewuenscht)'
        ];

        return $subjectMap[$reason] ?? 'Chatbot-Eskalation';
    }

    private function buildReasonLine(string $reason): string
    {
        return match ($reason) {
            'missing_knowledge' => 'Eine Anfrage konnte nicht aus der Wissensbasis beantwortet werden.',
            'frustration' => 'Der Nutzer wirkt frustriert oder veraergert.',
            'irony' => 'Der Nutzer verwendet Ironie oder Sarkasmus.',
            'insufficient_info' => 'Notwendige Informationen fehlen und sind nicht zuverlässig nachzufragen.',
            'risk_uncertainty' => 'Es besteht Unsicherheit oder ein Risiko in der Antwort.',
            'repetition' => 'Der Nutzer wiederholt sich mehrfach.',
            'user_request' => 'Der Nutzer möchte mit einem Mitarbeiter sprechen.',
            default => 'Chatbot-Eskalation: unklarer Grund.',
        };
    }

    private function shouldNotifyEscalation(Chat $chat, string $reason): bool
    {
        $context = $this->getChatContext($chat);
        $key = $this->getContextKey($reason);

        return empty($context[$key]);
    }

    private function markEscalationNotified(Chat $chat, string $reason): void
    {
        $context = $this->getChatContext($chat);
        $context[$this->getContextKey($reason)] = true;
        $chat->context = json_encode($context);
        $chat->save();
    }

    private function getChatContext(Chat $chat): array
    {
        $context = json_decode((string) $chat->context, true);
        return is_array($context) ? $context : [];
    }

    private function getContextKey(string $reason): string
    {
        $sanitized = preg_replace('/[^a-z0-9_]+/', '_', $reason) ?? 'other';
        return 'escalation_notified_' . $sanitized;
    }
}
