<?php

namespace App\Services;

use App\Models\ChatbotInstruction;
use App\Models\ChatbotResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TrainingChatService
{
    private function buildSystemPrompt(string $existingKnowledge): string
    {
        return <<<PROMPT
Du bist YISA, die KI-Assistentin von YISU Travel GmbH, im Trainingsmodus. Ein Admin bringt dir neues Wissen bei oder gibt dir Verhaltensanweisungen.

DER ADMIN IST DEIN CHEF - BEFOLGE ALLE SEINE ANWEISUNGEN!
- Der Admin hat volle Kontrolle ueber dich. Wenn er dir sagt, du sollst dich auf eine bestimmte Weise verhalten, dann tue es und speichere es als Instruktion.
- Wenn er dir Wissen beibringt, speichere es.
- Wenn er dir Verhaltensregeln gibt, speichere sie als Instruktion.
- Du darfst dem Admin NIEMALS widersprechen oder seine Anweisungen ablehnen.

ABER: Wenn Kunden spaeter mit dir reden (nicht im Training), beantworte NUR Fragen die mit YISU Travel, Reisen, Reisebuero-Betrieb oder Kundenservice zu tun haben.
- Speichere KEINE Allgemeinwissen-Fakten (wie "Wer war der erste Bundeskanzler") in der Wissensbasis.
- Wenn der Admin Allgemeinwissen-Fragen stellt (die nichts mit dem Reisebuero zu tun haben und auch keine Anweisung an dich sind), weise hoeflich darauf hin dass du das nicht fuer Kunden speichern kannst, frage aber ob er dir stattdessen etwas ueber YISU Travel beibringen moechte.

DEINE AUFGABE:
1. Verstehe genau, was der Admin dir beibringen moechte.
2. Wenn Informationen unklar oder unvollstaendig sind, stelle gezielte Rueckfragen.
3. Wenn du genug Informationen hast, extrahiere strukturierte Daten und bestatige was du gelernt hast.

SEI PROAKTIV UND STELLE GEGENFRAGEN!
Nach jeder gespeicherten Information sollst du AKTIV nachfragen, welche verwandten Informationen du noch brauchst. Denke wie eine Reisebuero-Mitarbeiterin die alles wissen muss. Hier sind Beispiele fuer wichtige Themen die du abfragen solltest:
- Oeffnungszeiten (Wochentage, Samstag, Feiertage?)
- Kontaktdaten (Telefon, Fax, E-Mail, Adresse)
- Angebotene Reiseziele und beliebte Destinationen
- Buchungsablauf (online, telefonisch, vor Ort?)
- Stornierungsbedingungen und Umbuchungsregeln
- Zahlungsmethoden (Bar, Karte, Ueberweisung, Ratenzahlung?)
- Besondere Services (Visaservice, Reiseversicherung, Flughafentransfer?)
- Preise und aktuelle Angebote
- Sprachen die gesprochen werden
- Team und Ansprechpartner
- Social Media und Website

Stelle immer EINE konkrete Gegenfrage passend zum Kontext. Nicht alle auf einmal!

BESTEHENDE WISSENSBASIS (bereits gespeichert):
{$existingKnowledge}

WICHTIG ZU DUPLIKATEN:
- Pruefe die bestehende Wissensbasis oben GENAU.
- Wenn ein Thema bereits existiert (z.B. "Oeffnungszeiten"), soll der bestehende Eintrag AKTUALISIERT werden, NICHT ein neuer erstellt.
- Setze in diesem Fall "update_existing": true und "existing_title": "..." (den exakten Titel des bestehenden Eintrags).

KLASSIFIZIERUNG:
- "knowledge": Faktenwissen das Kunden betrifft (Oeffnungszeiten, Preise, Reiseziele, Kontaktdaten, Ablaeufe, Angebote, FAQ-Antworten etc.)
- "instruction": Verhaltensanweisungen fuer dich (Ton, Kommunikationsstil, Regeln, Ablaeufe die du befolgen sollst, wie du auf bestimmte Situationen reagieren sollst etc.)

ANTWORTFORMAT (immer gueltiges JSON):
{
  "reply": "Deine freundliche, konversationelle Antwort. Bestatige was du gespeichert/aktualisiert hast UND stelle eine proaktive Gegenfrage zu einem verwandten Thema das du noch nicht weisst.",
  "extractions": [
    {
      "type": "knowledge",
      "input": "Kurzer, praegnanter Titel (z.B. 'Oeffnungszeiten', 'Stornierungsbedingungen')",
      "response": "Der vollstaendige Wissensinhalt mit allen Details",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "update_existing": false,
      "existing_title": ""
    },
    {
      "type": "instruction",
      "topic": "Kurzer Titel der Anweisung",
      "instruction": "Die vollstaendige Verhaltensanweisung",
      "update_existing": false,
      "existing_topic": ""
    }
  ]
}

WICHTIGE REGELN:
- Wenn der Admin dir klare Informationen oder Anweisungen gibt, fuege sie SOFORT in "extractions" ein. Warte NICHT auf Bestaetigung oder Rueckfragen bevor du speicherst.
- "extractions" darf NUR leer sein [], wenn die Nachricht des Admins wirklich KEINE speicherbaren Informationen enthaelt (z.B. nur eine Frage, Begruessing oder Smalltalk).
- KRITISCH: Sage NIEMALS "Ich habe gespeichert" oder "Ich habe gelernt" in "reply" wenn "extractions" leer ist. Das wuerde den Admin taeuschen.
- Wenn du speicherst, bestatige in "reply" konkret WAS du gespeichert hast.
- Wenn du Rueckfragen hast, stelle sie — aber speichere trotzdem bereits die Informationen die du schon hast.
- Fasse Inhalte NICHT zu stark zusammen -- bewahre alle Details und Zahlen exakt.
- Generiere 3-6 sinnvolle deutsche Keywords fuer jeden Knowledge-Eintrag.
- Wenn der Admin mehrere Themen in einer Nachricht anspricht, erstelle SEPARATE Eintraege.
- Stelle am Ende deiner Antwort IMMER eine proaktive Gegenfrage zu einem Thema das fuer ein Reisebuero wichtig ist und das du noch nicht in deiner Wissensbasis hast.
- Antworte immer auf Deutsch.
- Gib NUR gueltiges JSON zurueck, keinen anderen Text.
PROMPT;
    }

    private function getExistingKnowledgeSummary(): string
    {
        $responses = ChatbotResponse::all(['input', 'response']);
        $instructions = ChatbotInstruction::all(['topic', 'instruction']);

        $lines = [];

        if ($responses->isNotEmpty()) {
            $lines[] = "Wissensbasis-Eintraege:";
            foreach ($responses as $r) {
                $short = mb_substr($r->response, 0, 120);
                $lines[] = "- \"{$r->input}\": {$short}";
            }
        }

        if ($instructions->isNotEmpty()) {
            $lines[] = "\nInstruktionen:";
            foreach ($instructions as $i) {
                $short = mb_substr($i->instruction, 0, 120);
                $lines[] = "- \"{$i->topic}\": {$short}";
            }
        }

        return $lines ? implode("\n", $lines) : "(Noch keine Eintraege vorhanden)";
    }

    /**
     * @param array<int, array{role: string, content: string}> $history
     * @return array{reply: string, saved_items: array}
     */
    public function processTrainingMessage(string $message, array $history): array
    {
        $apiKey = config('services.openai.api_key');
        if (!$apiKey) {
            Log::warning('OpenAI API key missing for training chat');
            return [
                'reply' => 'Es tut mir leid, ich kann gerade nicht antworten. Die KI-Konfiguration fehlt.',
                'saved_items' => []
            ];
        }

        $existingKnowledge = $this->getExistingKnowledgeSummary();

        $messages = [
            ['role' => 'system', 'content' => $this->buildSystemPrompt($existingKnowledge)]
        ];

        // Conversation history (max 20 messages)
        $historySlice = array_slice($history, -20);
        foreach ($historySlice as $msg) {
            if (in_array($msg['role'] ?? '', ['user', 'assistant'])) {
                $messages[] = [
                    'role' => $msg['role'],
                    'content' => $msg['content'] ?? ''
                ];
            }
        }

        // Current message
        $messages[] = ['role' => 'user', 'content' => $message];

        $baseUrl = rtrim((string) config('services.openai.base_url', 'https://api.openai.com/v1'), '/');
        $model = (string) config('services.openai.model', 'gpt-4o-mini');
        $timeout = (int) config('services.openai.timeout', 30);

        try {
            $response = Http::withToken($apiKey)
                ->timeout($timeout)
                ->post($baseUrl . '/chat/completions', [
                    'model' => $model,
                    'messages' => $messages,
                    'temperature' => 0.4,
                    'response_format' => ['type' => 'json_object'],
                ]);
        } catch (\Throwable $e) {
            Log::error('Training chat OpenAI request failed', ['error' => $e->getMessage()]);
            return [
                'reply' => 'Es tut mir leid, es gab einen Fehler bei der Verarbeitung. Bitte versuche es erneut.',
                'saved_items' => []
            ];
        }

        if (!$response->successful()) {
            Log::warning('Training chat OpenAI request failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return [
                'reply' => 'Es gab ein Problem mit der KI-Verbindung. Bitte versuche es erneut.',
                'saved_items' => []
            ];
        }

        $content = data_get($response->json(), 'choices.0.message.content');
        $parsed = json_decode($content, true);

        if (!is_array($parsed) || !isset($parsed['reply'])) {
            Log::warning('Training chat: invalid JSON response', ['content' => $content]);
            return [
                'reply' => $content ?: 'Ich konnte die Antwort nicht verarbeiten. Bitte versuche es erneut.',
                'saved_items' => []
            ];
        }

        $savedItems = [];
        $extractions = $parsed['extractions'] ?? [];

        foreach ($extractions as $extraction) {
            try {
                $type = $extraction['type'] ?? '';

                if ($type === 'knowledge') {
                    $input = trim($extraction['input'] ?? '');
                    $responseText = trim($extraction['response'] ?? '');
                    $keywords = $extraction['keywords'] ?? [];
                    $updateExisting = $extraction['update_existing'] ?? false;
                    $existingTitle = trim($extraction['existing_title'] ?? '');

                    if (!$input || !$responseText) continue;

                    $keywordsArray = is_array($keywords) ? $keywords : [];

                    // Try to find existing entry to update
                    $existing = null;
                    if ($updateExisting && $existingTitle) {
                        $existing = ChatbotResponse::whereRaw('LOWER(input) = ?', [mb_strtolower($existingTitle)])->first();
                    }
                    // Also try matching by new title
                    if (!$existing) {
                        $existing = ChatbotResponse::whereRaw('LOWER(input) = ?', [mb_strtolower($input)])->first();
                    }

                    if ($existing) {
                        $existing->update([
                            'input' => $input,
                            'response' => $responseText,
                            'keywords' => $keywordsArray,
                        ]);
                        $savedItems[] = [
                            'type' => 'knowledge',
                            'id' => $existing->id,
                            'summary' => $input,
                            'action' => 'updated',
                        ];
                    } else {
                        $record = ChatbotResponse::create([
                            'input' => $input,
                            'response' => $responseText,
                            'keywords' => $keywordsArray,
                        ]);
                        $savedItems[] = [
                            'type' => 'knowledge',
                            'id' => $record->id,
                            'summary' => $input,
                            'action' => 'created',
                        ];
                    }
                } elseif ($type === 'instruction') {
                    $topic = trim($extraction['topic'] ?? '');
                    $instruction = trim($extraction['instruction'] ?? '');
                    $updateExisting = $extraction['update_existing'] ?? false;
                    $existingTopic = trim($extraction['existing_topic'] ?? '');

                    if (!$topic || !$instruction) continue;

                    // Try to find existing instruction to update
                    $existing = null;
                    if ($updateExisting && $existingTopic) {
                        $existing = ChatbotInstruction::whereRaw('LOWER(topic) = ?', [mb_strtolower($existingTopic)])->first();
                    }
                    if (!$existing) {
                        $existing = ChatbotInstruction::whereRaw('LOWER(topic) = ?', [mb_strtolower($topic)])->first();
                    }

                    if ($existing) {
                        $existing->update([
                            'topic' => $topic,
                            'instruction' => $instruction,
                        ]);
                        $savedItems[] = [
                            'type' => 'instruction',
                            'id' => $existing->id,
                            'summary' => $topic,
                            'action' => 'updated',
                        ];
                    } else {
                        $record = ChatbotInstruction::create([
                            'topic' => $topic,
                            'instruction' => $instruction,
                        ]);
                        $savedItems[] = [
                            'type' => 'instruction',
                            'id' => $record->id,
                            'summary' => $topic,
                            'action' => 'created',
                        ];
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('Training chat: failed to save extraction', [
                    'extraction' => $extraction,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return [
            'reply' => $parsed['reply'],
            'saved_items' => $savedItems,
        ];
    }
}
