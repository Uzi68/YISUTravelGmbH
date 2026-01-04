<?php

namespace App\Services;

use App\Models\Chat;
use App\Models\ChatbotInstruction;
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

        $messages = $this->buildMessages($chat, $input, $knowledgeEntries, $knowledgeOnly);
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
     * @return array{decision: string, reply: string}
     */
    public function interpretEscalationDecision(Chat $chat, string $input): array
    {
        $apiKey = config('services.openai.api_key');
        if (!$apiKey) {
            Log::warning('OpenAI API key missing for escalation decision');
            return [
                'decision' => 'unknown',
                'reply' => ''
            ];
        }

        $baseUrl = rtrim((string) config('services.openai.base_url', 'https://api.openai.com/v1'), '/');
        $model = (string) config('services.openai.model', 'gpt-4o-mini');
        $timeout = (int) config('services.openai.timeout', 20);

        $systemPrompt = 'Classify whether the user accepts or declines speaking with a staff member. '
            . 'The assistant message (if provided) is the last question about speaking with staff. '
            . 'Return JSON with fields "decision" (accept, decline, unknown) and "reply" (string). '
            . 'Choose accept if the user clearly agrees or expresses desire/consent in that context, '
            . 'even if they do not say an explicit yes. Short affirmations or "I want" replies count. '
            . 'Choose decline if the user clearly refuses or says they do not want to speak with staff. '
            . 'If the user introduces another request or topic, decision must be unknown. '
            . 'Complaints, frustration, repetition, or unrelated messages are NOT a decline or accept. '
            . 'If decision is accept or decline, reply with a short, professional confirmation in the same language '
            . 'as the user message. If decision is unknown, reply must be an empty string. '
            . 'Do not mix languages.';

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
        ];

        $lastBotMessage = Message::query()
            ->where('chat_id', $chat->id)
            ->where('from', 'bot')
            ->orderBy('created_at', 'desc')
            ->value('text');
        if (is_string($lastBotMessage) && trim($lastBotMessage) !== '') {
            $messages[] = ['role' => 'assistant', 'content' => trim($lastBotMessage)];
        }

        $messages[] = ['role' => 'user', 'content' => trim($input)];

        $payload = [
            'model' => $model,
            'messages' => $messages,
            'temperature' => 0.0,
            'response_format' => ['type' => 'json_object']
        ];

        try {
            $response = Http::withToken($apiKey)
                ->timeout($timeout)
                ->post($baseUrl . '/chat/completions', $payload);
        } catch (\Throwable $e) {
            Log::error('OpenAI escalation decision failed', ['error' => $e->getMessage()]);
            return [
                'decision' => 'unknown',
                'reply' => ''
            ];
        }

        if (!$response->successful()) {
            Log::warning('OpenAI escalation decision failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return [
                'decision' => 'unknown',
                'reply' => ''
            ];
        }

        $content = data_get($response->json(), 'choices.0.message.content');
        $decoded = is_string($content) ? json_decode($content, true) : null;

        if (!is_array($decoded)) {
            return [
                'decision' => 'unknown',
                'reply' => ''
            ];
        }

        $decision = (string) ($decoded['decision'] ?? 'unknown');
        $reply = $this->sanitizeReply((string) ($decoded['reply'] ?? ''));

        if (!in_array($decision, ['accept', 'decline', 'unknown'], true)) {
            $decision = 'unknown';
        }

        if ($decision !== 'unknown' && $reply === '') {
            $decision = 'unknown';
        }

        return [
            'decision' => $decision,
            'reply' => $reply
        ];
    }

    public function generateEscalationDecisionReply(string $input, string $decision): string
    {
        $apiKey = config('services.openai.api_key');
        if (!$apiKey) {
            Log::warning('OpenAI API key missing for escalation reply');
            return '';
        }

        $baseUrl = rtrim((string) config('services.openai.base_url', 'https://api.openai.com/v1'), '/');
        $model = (string) config('services.openai.model', 'gpt-4o-mini');
        $timeout = (int) config('services.openai.timeout', 20);

        $decisionLabel = strtoupper($decision) === 'DECLINE' ? 'DECLINE' : 'ACCEPT';
        $systemPrompt = 'Write a short, professional confirmation message for this decision: ' . $decisionLabel . '. '
            . 'Use the same language as the user message. Do not mix languages. '
            . 'Do not make assumptions about the user intent. '
            . 'Output plain text only.';

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => trim($input)]
        ];

        $payload = [
            'model' => $model,
            'messages' => $messages,
            'temperature' => 0.2
        ];

        try {
            $response = Http::withToken($apiKey)
                ->timeout($timeout)
                ->post($baseUrl . '/chat/completions', $payload);
        } catch (\Throwable $e) {
            Log::error('OpenAI escalation reply failed', ['error' => $e->getMessage()]);
            return '';
        }

        if (!$response->successful()) {
            Log::warning('OpenAI escalation reply failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return '';
        }

        $content = data_get($response->json(), 'choices.0.message.content');
        $reply = is_string($content) ? trim($content) : '';
        return $this->sanitizeReply($reply);
    }

    public function generateEscalationPromptMessage(string $input): string
    {
        $apiKey = config('services.openai.api_key');
        if (!$apiKey) {
            Log::warning('OpenAI API key missing for escalation prompt');
            return '';
        }

        $baseUrl = rtrim((string) config('services.openai.base_url', 'https://api.openai.com/v1'), '/');
        $model = (string) config('services.openai.model', 'gpt-4o-mini');
        $timeout = (int) config('services.openai.timeout', 20);

        $systemPrompt = 'Write a short, professional reply in the same language as the user. '
            . 'Briefly acknowledge the issue or limitation, then ask if the user wants to speak with a staff member. '
            . 'Do not mix languages. Output plain text only.';

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => trim($input)]
        ];

        $payload = [
            'model' => $model,
            'messages' => $messages,
            'temperature' => 0.2
        ];

        try {
            $response = Http::withToken($apiKey)
                ->timeout($timeout)
                ->post($baseUrl . '/chat/completions', $payload);
        } catch (\Throwable $e) {
            Log::error('OpenAI escalation prompt failed', ['error' => $e->getMessage()]);
            return '';
        }

        if (!$response->successful()) {
            Log::warning('OpenAI escalation prompt failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return '';
        }

        $content = data_get($response->json(), 'choices.0.message.content');
        $reply = is_string($content) ? trim($content) : '';
        return $this->sanitizeReply($reply);
    }

    /**
     * @return array{user_text: string, bot_reply: string}
     */
    public function generateEscalationDecisionTexts(string $input, string $decision): array
    {
        $apiKey = config('services.openai.api_key');
        if (!$apiKey) {
            Log::warning('OpenAI API key missing for escalation texts');
            return [
                'user_text' => '',
                'bot_reply' => ''
            ];
        }

        $baseUrl = rtrim((string) config('services.openai.base_url', 'https://api.openai.com/v1'), '/');
        $model = (string) config('services.openai.model', 'gpt-4o-mini');
        $timeout = (int) config('services.openai.timeout', 20);

        $decisionLabel = strtoupper($decision) === 'DECLINE' ? 'DECLINE' : 'ACCEPT';
        $systemPrompt = 'You are generating two short, professional texts based on a decision: ' . $decisionLabel . '. '
            . 'Return JSON with fields "user_text" and "bot_reply". '
            . '"user_text" should be a short yes/no in the same language as the user message. '
            . '"bot_reply" should be a short confirmation in the same language. '
            . 'Do not make assumptions about the user intent. '
            . 'Do not mix languages.';

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => trim($input)]
        ];

        $payload = [
            'model' => $model,
            'messages' => $messages,
            'temperature' => 0.0,
            'response_format' => ['type' => 'json_object']
        ];

        try {
            $response = Http::withToken($apiKey)
                ->timeout($timeout)
                ->post($baseUrl . '/chat/completions', $payload);
        } catch (\Throwable $e) {
            Log::error('OpenAI escalation texts failed', ['error' => $e->getMessage()]);
            return [
                'user_text' => '',
                'bot_reply' => ''
            ];
        }

        if (!$response->successful()) {
            Log::warning('OpenAI escalation texts failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return [
                'user_text' => '',
                'bot_reply' => ''
            ];
        }

        $content = data_get($response->json(), 'choices.0.message.content');
        $decoded = is_string($content) ? json_decode($content, true) : null;

        if (!is_array($decoded)) {
            return [
                'user_text' => '',
                'bot_reply' => ''
            ];
        }

        return [
            'user_text' => $this->sanitizeReply((string) ($decoded['user_text'] ?? '')),
            'bot_reply' => $this->sanitizeReply((string) ($decoded['bot_reply'] ?? ''))
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
        bool $knowledgeOnly
    ): array
    {
        $historyLimit = (int) config('services.openai.history', 12);
        $instructionPrompt = $this->buildInstructionPrompt();
        $systemPrompt = $instructionPrompt !== '' ? $instructionPrompt : (string) config(
            'services.openai.system_prompt',
            'Du bist der YISU Travel Assistent. Antworte kurz, hilfreich und freundlich.'
        );
        if ($knowledgeOnly) {
            $systemPrompt .= ' Antworte ausschließlich mit Informationen aus der Wissensbasis. '
                . 'Wenn eine Information fehlt, sage das offen.';
        }
        $systemPrompt .= ' Antworte ausschliesslich in der Sprache der letzten Nutzereingabe und mische keine Sprachen.';
        $systemPrompt .= ' Wenn die Wissensbasis in einer anderen Sprache ist, uebersetze sie in diese Sprache.';
        $systemPrompt .= ' Erfinde keine YISU-Travel-spezifischen Fakten.';
        $systemPrompt .= ' Antworte als JSON-Objekt mit den Feldern "reply" (string), '
            . '"needs_escalation" (boolean) und "escalation_reason" '
            . '(string: "frustration", "repetition", "user_request", "none"). '
            . 'Setze "needs_escalation" nur auf true, wenn der Nutzer klar '
            . 'frustriert/veraergert ist, sich mehrfach wiederholt oder explizit '
            . 'einen Mitarbeiter verlangt. '
            . 'Bei fehlender Wissensbasis, Unsicherheit, unklaren Angaben oder '
            . 'Anfragen ausserhalb des Reisebereichs antworte selbststaendig, '
            . 'stelle Rueckfragen falls sinnvoll, und setze '
            . '"needs_escalation" auf false und "escalation_reason" auf "none". '
            . 'Wenn "needs_escalation" true ist, antworte zuerst kurz auf die Nachricht '
            . 'und stelle danach eine kurze Rueckfrage, ob der Nutzer mit einem '
            . 'Mitarbeiter sprechen moechte. '
            . 'Auch bei "escalation_reason" = "user_request" immer um Bestaetigung bitten. '
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

    private function buildInstructionPrompt(): string
    {
        try {
            $instructions = ChatbotInstruction::query()
                ->orderBy('id')
                ->get();
        } catch (\Throwable $e) {
            Log::warning('Failed to load chatbot instructions', ['error' => $e->getMessage()]);
            return '';
        }

        if ($instructions->isEmpty()) {
            return '';
        }

        $lines = [];
        foreach ($instructions as $instruction) {
            $topic = trim((string) $instruction->topic);
            $text = trim((string) $instruction->instruction);
            if ($text === '') {
                continue;
            }
            if ($topic !== '') {
                $lines[] = '- Thema: ' . $topic;
                $lines[] = '  Anweisung: ' . $text;
            } else {
                $lines[] = '- ' . $text;
            }
        }

        if ($lines === []) {
            return '';
        }

        return "Admin-Instruktionen (immer befolgen):\n" . implode("\n", $lines);
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
