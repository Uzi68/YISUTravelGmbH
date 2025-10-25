<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Route;
use Spatie\Permission\Middleware\RoleMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
        then: function () {
            Route::middleware([])
                ->group(base_path('routes/webhooks.php'));
        }
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->statefulApi();

        $middleware->alias([
            'role' => RoleMiddleware::class
        ]);

        $middleware->validateCsrfTokens(except: [
            'api/chatbot/input/anonymous',
            'api/chatbot/end_chatbotSession',
            'api/register-visitor',
            'api/chat/*/takeover',
            'api/send-to-human-chat',
            'api/reset-chat-assignment',
            'api/escalation-prompt/response',
            'api/broadcasting/auth/visitor',
            'api/whatsapp/webhook',
            'whatsapp/webhook',
            'api/whatsapp/send-text',      // ✅ WhatsApp Text senden
            'api/whatsapp/send-image',     // ✅ WhatsApp Bild senden
            'api/whatsapp/send-video',     // ✅ WhatsApp Video senden
            'api/whatsapp/send-document',  // ✅ WhatsApp Dokument senden
            'api/whatsapp/send-audio',     // ✅ WhatsApp Audio senden
            'api/customer/register',       // ✅ Kunden-Registrierung
            'api/password/reset-link',     // ✅ Passwort-Reset-Link senden
            'api/password/reset',          // ✅ Passwort zurücksetzen
            'api/login',                   // ✅ Login für alle Benutzer
            'api/appointments',
            'api/appointments/blocked-slots'
        ]
        );
        /*
        $middleware->group('api', [
            \App\Http\Middleware\ValidateSessionId::class,
        ]);
        */
    })

    ->withProviders([
        App\Providers\BroadcastServiceProvider::class,
    ])
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
