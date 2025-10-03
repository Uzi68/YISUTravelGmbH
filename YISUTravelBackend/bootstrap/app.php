<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Spatie\Permission\Middleware\RoleMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
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
            'api/broadcasting/auth/visitor'
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
