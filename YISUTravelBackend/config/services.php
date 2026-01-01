<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | WhatsApp Business API Configuration
    |--------------------------------------------------------------------------
    */

    'whatsapp' => [
        'api_url' => env('WHATSAPP_API_URL', 'https://graph.facebook.com'),
        'api_version' => env('WHATSAPP_API_VERSION', 'v22.0'),
        'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
        'access_token' => env('WHATSAPP_ACCESS_TOKEN'),
        'app_secret' => env('WHATSAPP_APP_SECRET'),
        'verify_token' => env('WHATSAPP_VERIFY_TOKEN'),
    ],

    'fcm' => [
        'project_id' => env('FCM_PROJECT_ID'),
        'credentials_file' => env('FCM_CREDENTIALS_FILE'),
        'client_email' => env('FCM_CLIENT_EMAIL'),
        'private_key' => env('FCM_PRIVATE_KEY'),
        'enabled' => env('FCM_ENABLED', false),
    ],

    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
        'base_url' => env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
        'temperature' => env('OPENAI_TEMPERATURE', 0.3),
        'timeout' => env('OPENAI_TIMEOUT', 20),
        'history' => env('OPENAI_HISTORY', 12),
        'knowledge_limit' => env('OPENAI_KNOWLEDGE_LIMIT', 6),
        'knowledge_min_score' => env('OPENAI_KNOWLEDGE_MIN_SCORE', 2),
        'knowledge_min_token_length' => env('OPENAI_KNOWLEDGE_MIN_TOKEN_LENGTH', 4),
        'knowledge_max_chars' => env('OPENAI_KNOWLEDGE_MAX_CHARS', 600),
        'knowledge_max_candidates' => env('OPENAI_KNOWLEDGE_MAX_CANDIDATES', 200),
        'knowledge_fallback_all' => env('OPENAI_KNOWLEDGE_FALLBACK_ALL', true),
        'knowledge_fallback_max_total' => env('OPENAI_KNOWLEDGE_FALLBACK_MAX_TOTAL', 25),
        'knowledge_fallback_limit' => env('OPENAI_KNOWLEDGE_FALLBACK_LIMIT', 25),
        'knowledge_only' => env('OPENAI_KNOWLEDGE_ONLY', false),
        'knowledge_missing_to' => env('OPENAI_KNOWLEDGE_MISSING_TO', 'info@yisu-travel.de'),
        'knowledge_missing_subject' => env(
            'OPENAI_KNOWLEDGE_MISSING_SUBJECT',
            'Neue Chatbot-Anfrage ohne Wissenseintrag'
        ),
        'escalation_suppress_minutes' => env('OPENAI_ESCALATION_SUPPRESS_MINUTES', 60),
        'strip_markdown' => env('OPENAI_STRIP_MARKDOWN', true),
        'structured_responses' => env('OPENAI_STRUCTURED_RESPONSES', true),
        'system_prompt' => env(
            'OPENAI_SYSTEM_PROMPT',
            'Du bist der YISU Travel Assistent. Antworte kurz, hilfreich, freundlich und ohne Markdown.'
        ),
        'knowledge_missing_reply' => env(
            'OPENAI_KNOWLEDGE_MISSING_REPLY',
            'Dazu habe ich keine Information in der Wissensbasis.'
        ),
        'fallback_reply' => env(
            'OPENAI_FALLBACK_REPLY',
            'Entschuldigung, ich konnte das gerade nicht beantworten. Bitte versuche es erneut.'
        ),
    ],

];
