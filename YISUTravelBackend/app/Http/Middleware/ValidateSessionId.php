<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class ValidateSessionId
{
    public function handle($request, Closure $next)
    {
        $sessionId = $request->header('X-Session-ID');

        if ($sessionId && !Str::isUuid($sessionId)) {
            return response()->json([
                'error' => 'Invalid session ID format',
                'expected_format' => 'UUID v4'
            ], 400);
        }

        return $next($request);
    }
}
