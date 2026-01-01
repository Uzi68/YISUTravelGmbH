<?php

namespace App\Services;

use App\Models\Chat;
use App\Models\ChatbotResponse;
use App\Models\Message;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenAiChatService
{
    /**
     * @return array{reply: string, knowledge_hit: bool, needs_escalation: bool, escalation_reason: string}
     */
    public function generateReply(Chat $chat, string $input): array
    {
        $apiKey = config('services.openai.api_key');
        if (!$apiKey) {
            Log::warning('OpenAI API key missing');
            return [
                'reply' => $this->fallbackReply(),
                'knowledge_hit' => false,
                'needs_escalation' => false,
                'escalation_reason' => 'none'
            ];
        }

        $knowledgeResult = $this->findKnowledgeEntries($input);
        $knowledgeEntries = $knowledgeResult['entries'];
        $knowledgeOnly = filter_var(
            config('services.openai.knowledge_only', false),
            FILTER_VALIDATE_BOOLEAN
        );
        $knowledgeHit = (bool) $knowledgeResult['matched'];
        if ($knowledgeOnly && !$knowledgeHit) {
            return [
                'reply' => $this->knowledgeMissingReply(),
                'knowledge_hit' => false,
                'needs_escalation' => true,
                'escalation_reason' => 'missing_knowledge'
            ];
        }

        $language = $this->detectLanguage($input);
        $messages = $this->buildMessages($chat, $input, $knowledgeEntries, $knowledgeOnly, $language);
        $baseUrl = rtrim((string) config('services.openai.base_url', 'https://api.openai.com/v1'), '/');
        $model = (string) config('services.openai.model', 'gpt-4o-mini');
        $temperature = (float) config('services.openai.temperature', 0.3);
        $timeout = (int) config('services.openai.timeout', 20);
        $structuredResponses = filter_var(
            config('services.openai.structured_responses', true),
            FILTER_VALIDATE_BOOLEAN
        );

        $payload = [
            'model' => $model,
            'messages' => $messages,
            'temperature' => $temperature,
        ];
        if ($structuredResponses) {
            $payload['response_format'] = ['type' => 'json_object'];
        }

        try {
            $response = Http::withToken($apiKey)
                ->timeout($timeout)
                ->post($baseUrl . '/chat/completions', $payload);
        } catch (\Throwable $e) {
            Log::error('OpenAI request failed', ['error' => $e->getMessage()]);
            return [
                'reply' => $this->fallbackReply(),
                'knowledge_hit' => $knowledgeHit,
                'needs_escalation' => false,
                'escalation_reason' => 'none'
            ];
        }

        if (!$response->successful()) {
            Log::warning('OpenAI request failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return [
                'reply' => $this->fallbackReply(),
                'knowledge_hit' => $knowledgeHit,
                'needs_escalation' => false,
                'escalation_reason' => 'none'
            ];
        }

        $content = data_get($response->json(), 'choices.0.message.content');
        $parsed = $structuredResponses ? $this->parseStructuredResponse($content) : null;
        if (is_array($parsed)) {
            $reply = $this->sanitizeReply((string) ($parsed['reply'] ?? ''));
            $needsEscalation = (bool) ($parsed['needs_escalation'] ?? false);
            $reason = (string) ($parsed['escalation_reason'] ?? 'none');

            return [
                'reply' => $reply !== '' ? $reply : $this->fallbackReply(),
                'knowledge_hit' => $knowledgeHit,
                'needs_escalation' => $needsEscalation,
                'escalation_reason' => $reason !== '' ? $reason : 'none'
            ];
        }

        $reply = is_string($content) ? trim($content) : '';
        $reply = $reply !== '' ? $reply : $this->fallbackReply();
        $reply = $this->sanitizeReply($reply);

        return [
            'reply' => $reply,
            'knowledge_hit' => $knowledgeHit,
            'needs_escalation' => false,
            'escalation_reason' => 'none'
        ];
    }

    /**
     * @param array<int, ChatbotResponse> $knowledgeEntries
     * @return array<int, array{role: string, content: string}>
     */
    private function buildMessages(
        Chat $chat,
        string $input,
        array $knowledgeEntries,
        bool $knowledgeOnly,
        string $language
    ): array
    {
        $historyLimit = (int) config('services.openai.history', 12);
        $systemPrompt = (string) config(
            'services.openai.system_prompt',
            'Du bist der YISU Travel Assistent. Antworte kurz, hilfreich und freundlich.'
        );
        if ($knowledgeOnly) {
            $systemPrompt .= ' Antworte ausschließlich mit Informationen aus der Wissensbasis. '
                . 'Wenn eine Information fehlt, sage das offen.';
        }
        $systemPrompt .= ' Antworte in der Sprache der letzten Nutzereingabe.';
        $systemPrompt .= ' Wenn die Wissensbasis in einer anderen Sprache ist, uebersetze sie.';
        $systemPrompt .= ' Erfinde keine YISU-Travel-spezifischen Fakten.';
        $systemPrompt .= ' Antworte als JSON-Objekt mit den Feldern "reply" (string), '
            . '"needs_escalation" (boolean) und "escalation_reason" '
            . '(string: "missing_knowledge", "frustration", "irony", '
            . '"insufficient_info", "risk_uncertainty", "repetition", '
            . '"user_request", "none"). '
            . 'Setze "needs_escalation" auf true, wenn die Wissensbasis keine passende '
            . 'Information enthaelt, der Nutzer aergerlich/frustriert/ironisch wirkt, '
            . 'notwendige Informationen fehlen und nicht zuverlaessig per Rueckfrage '
            . 'zu erhalten sind, die Unsicherheit oder das Risiko der Antwort steigt, '
            . 'oder der Nutzer sich mehrfach wiederholt. '
            . 'Wenn der Nutzer explizit einen Mitarbeiter wuenscht, setze '
            . '"needs_escalation" auf true und "escalation_reason" auf "user_request". '
            . 'Bei einfachen Fragen, Small Talk oder klar beantwortbaren Anliegen '
            . 'antworte normal mit "needs_escalation": false.';

        $historySources = $knowledgeOnly ? ['user'] : ['user', 'bot'];
        $history = Message::query()
            ->where('chat_id', $chat->id)
            ->whereIn('from', $historySources)
            ->orderBy('created_at', 'desc')
            ->limit($historyLimit)
            ->get()
            ->sortBy('created_at');

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
        ];

        if ($language !== 'auto') {
            $messages[] = [
                'role' => 'system',
                'content' => $this->buildLanguageDirective($language)
            ];
        }
        $knowledgeContext = $this->buildKnowledgeContext($knowledgeEntries);
        if ($knowledgeContext !== '') {
            $messages[] = ['role' => 'system', 'content' => $knowledgeContext];
        }

        foreach ($history as $message) {
            $role = $message->from === 'user' ? 'user' : 'assistant';
            $messages[] = ['role' => $role, 'content' => (string) $message->text];
        }

        $lastHistory = $history->last();
        $inputTrimmed = trim($input);
        if (!$lastHistory || $lastHistory->from !== 'user' || trim((string) $lastHistory->text) !== $inputTrimmed) {
            $messages[] = ['role' => 'user', 'content' => $inputTrimmed];
        }

        return $messages;
    }

    /**
     * @param array<int, ChatbotResponse> $entries
     */
    private function buildKnowledgeContext(array $entries): string
    {
        if ($entries === []) {
            return '';
        }

        $maxChars = (int) config('services.openai.knowledge_max_chars', 600);
        $lines = array_map(function (ChatbotResponse $entry) use ($maxChars) {
            $title = trim((string) $entry->input);
            $content = $this->truncateText((string) $entry->response, $maxChars);
            if ($title === '') {
                return '- ' . $content;
            }
            return '- ' . $title . ': ' . $content;
        }, $entries);

        return "Wissensbasis (nur verwenden, wenn relevant; wenn Informationen fehlen, sage das offen):\n"
            . implode("\n", $lines);
    }

    /**
     * @return array<int, ChatbotResponse>
     */
    private function findKnowledgeEntries(string $input): array
    {
        $limit = (int) config('services.openai.knowledge_limit', 6);
        $minScore = max(0, (int) config('services.openai.knowledge_min_score', 2));
        $tokens = $this->extractTokens($input);

        if ($limit <= 0 || $tokens === []) {
            return [
                'entries' => [],
                'matched' => false
            ];
        }

        $candidates = $this->loadKnowledgeCandidates($tokens);
        if ($candidates->isEmpty()) {
            return [
                'entries' => [],
                'matched' => false
            ];
        }

        $scored = [];
        foreach ($candidates as $entry) {
            $score = $this->scoreKnowledgeEntry($entry, $tokens);
            if ($score >= $minScore) {
                $scored[] = ['entry' => $entry, 'score' => $score];
            }
        }

        usort($scored, function (array $a, array $b) {
            if ($a['score'] === $b['score']) {
                return $a['entry']->id <=> $b['entry']->id;
            }
            return $b['score'] <=> $a['score'];
        });

        $top = array_slice($scored, 0, max($limit, 0));

        $entries = array_map(function (array $item) {
            return $item['entry'];
        }, $top);

        if ($entries === []) {
            return [
                'entries' => $this->fallbackKnowledgeEntries(),
                'matched' => false
            ];
        }

        return [
            'entries' => $entries,
            'matched' => true
        ];
    }

    private function loadKnowledgeCandidates(array $tokens): Collection
    {
        $maxCandidates = (int) config('services.openai.knowledge_max_candidates', 200);
        $total = ChatbotResponse::count();

        if ($total <= $maxCandidates) {
            return ChatbotResponse::query()
                ->select(['id', 'input', 'response', 'keywords'])
                ->get();
        }

        return ChatbotResponse::query()
            ->select(['id', 'input', 'response', 'keywords'])
            ->where(function ($query) use ($tokens) {
                foreach ($tokens as $token) {
                    $query->orWhere('input', 'like', '%' . $token . '%')
                        ->orWhere('response', 'like', '%' . $token . '%');
                }
            })
            ->limit($maxCandidates)
            ->get();
    }

    /**
     * @return array<int, ChatbotResponse>
     */
    private function fallbackKnowledgeEntries(): array
    {
        $fallbackEnabled = filter_var(
            config('services.openai.knowledge_fallback_all', true),
            FILTER_VALIDATE_BOOLEAN
        );
        if (!$fallbackEnabled) {
            return [];
        }

        $maxTotal = (int) config('services.openai.knowledge_fallback_max_total', 25);
        $fallbackLimit = (int) config('services.openai.knowledge_fallback_limit', 25);
        $total = ChatbotResponse::count();

        if ($total === 0 || $total > $maxTotal) {
            return [];
        }

        $limit = $fallbackLimit > 0 ? min($fallbackLimit, $total) : $total;

        return ChatbotResponse::query()
            ->select(['id', 'input', 'response', 'keywords'])
            ->orderBy('id')
            ->limit($limit)
            ->get()
            ->all();
    }

    /**
     * @param array<int, string> $tokens
     */
    private function scoreKnowledgeEntry(ChatbotResponse $entry, array $tokens): int
    {
        $score = 0;
        $input = mb_strtolower((string) $entry->input);
        $response = mb_strtolower((string) $entry->response);
        $keywords = array_map(function ($keyword) {
            return mb_strtolower((string) $keyword);
        }, $entry->keywords ?? []);

        foreach ($tokens as $token) {
            if ($token !== '' && str_contains($input, $token)) {
                $score += 3;
            }
            if ($token !== '' && str_contains($response, $token)) {
                $score += 1;
            }
            if ($token !== '' && in_array($token, $keywords, true)) {
                $score += 4;
            }
        }

        return $score;
    }

    /**
     * @return array<int, string>
     */
    private function extractTokens(string $input): array
    {
        $minLength = (int) config('services.openai.knowledge_min_token_length', 4);
        $normalized = mb_strtolower($input);
        $normalized = preg_replace('/[^\p{L}\p{N}\s]+/u', ' ', $normalized) ?? '';
        $parts = preg_split('/\s+/', trim($normalized)) ?: [];

        $tokens = array_filter($parts, function (string $token) use ($minLength) {
            return mb_strlen($token) >= $minLength;
        });

        return array_values(array_unique($tokens));
    }

    private function truncateText(string $text, int $maxChars): string
    {
        if ($maxChars <= 0) {
            return trim($text);
        }

        $text = trim($text);
        if (mb_strlen($text) <= $maxChars) {
            return $text;
        }

        return rtrim(mb_substr($text, 0, $maxChars)) . '...';
    }

    private function detectLanguage(string $input): string
    {
        $normalized = $this->normalizeLanguageText($input);

        $scores = [
            'de' => 0,
            'en' => 0,
            'tr' => 0
        ];

        $deWords = ['hallo', 'danke', 'bitte', 'oeffnungszeiten', 'reisebuero', 'wie', 'was', 'wer', 'wann', 'wo'];
        $enWords = ['hello', 'thank', 'please', 'opening', 'hours', 'business', 'what', 'who', 'when', 'where', 'can', 'english'];
        $trWords = ['merhaba', 'tesekkur', 'lutf', 'saat', 'acik', 'kapali', 'nasil', 'neden', 'nerede', 'kim', 'ingilizce'];

        foreach ($deWords as $word) {
            if (str_contains($normalized, $word)) {
                $scores['de']++;
            }
        }
        foreach ($enWords as $word) {
            if (str_contains($normalized, $word)) {
                $scores['en']++;
            }
        }
        foreach ($trWords as $word) {
            if (str_contains($normalized, $word)) {
                $scores['tr']++;
            }
        }

        $max = max($scores);
        if ($max === 0) {
            return 'auto';
        }

        foreach ($scores as $lang => $score) {
            if ($score === $max) {
                return $lang;
            }
        }

        return 'auto';
    }

    private function normalizeLanguageText(string $input): string
    {
        $text = mb_strtolower($input);
        $text = str_replace(['ä', 'ö', 'ü', 'ß'], ['ae', 'oe', 'ue', 'ss'], $text);
        $text = str_replace(['ı', 'ğ', 'ş', 'ç', 'ö', 'ü'], ['i', 'g', 's', 'c', 'o', 'u'], $text);

        return $text;
    }

    private function buildLanguageDirective(string $language): string
    {
        $map = [
            'de' => 'Antwortsprache: Deutsch.',
            'en' => 'Answer language: English.',
            'tr' => 'Cevap dili: Turkce.'
        ];

        return $map[$language] ?? 'Answer language: English.';
    }

    private function fallbackReply(): string
    {
        return (string) config(
            'services.openai.fallback_reply',
            'Entschuldigung, ich konnte das gerade nicht beantworten. Bitte versuche es erneut.'
        );
    }

    private function knowledgeMissingReply(): string
    {
        return (string) config(
            'services.openai.knowledge_missing_reply',
            'Dazu habe ich keine Information in der Wissensbasis.'
        );
    }

    private function sanitizeReply(string $reply): string
    {
        $stripMarkdown = filter_var(
            config('services.openai.strip_markdown', true),
            FILTER_VALIDATE_BOOLEAN
        );

        if (!$stripMarkdown) {
            return $reply;
        }

        $reply = str_replace(['**', '__'], '', $reply);

        return trim($reply);
    }

    /**
     * @return array{reply?: string, needs_escalation?: bool, escalation_reason?: string}|null
     */
    private function parseStructuredResponse(mixed $content): ?array
    {
        if (!is_string($content) || trim($content) === '') {
            return null;
        }

        $decoded = json_decode($content, true);
        if (!is_array($decoded)) {
            return null;
        }

        return $decoded;
    }
}
