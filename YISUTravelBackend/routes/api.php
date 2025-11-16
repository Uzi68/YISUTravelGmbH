<?php

use App\Http\Controllers\BookingController;
use App\Http\Controllers\BroadcastAuthController;
use App\Http\Controllers\ChatAssignmentController;
use App\Http\Controllers\ChatbotController;
use App\Http\Controllers\ChatbotResponses;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\ChatRequestController;
use App\Http\Controllers\MessagePusherController;
use App\Http\Controllers\MessageAttachmentController;
use App\Http\Controllers\HomepageStatisticsController;
use App\Http\Controllers\WhatsAppWebhookController;
use App\Http\Controllers\WhatsAppMessageController;
use App\Http\Controllers\OfferController;
use App\Http\Controllers\AppointmentController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\VisitorController;
use App\Http\Controllers\UserManagementController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\PushSubscriptionController;
use Pusher\Pusher;

Route::post('/login', [AuthController::class, 'login'])->middleware('guest');

Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth');

// Password reset routes (public)
Route::post('/password/reset-link', [AuthController::class, 'sendPasswordResetLink']);
Route::post('/password/reset', [AuthController::class, 'resetPassword']);

// Customer registration (public)
Route::post('/customer/register', [CustomerController::class, 'register']);

//Überprüfe ob der Nutzer Authentifiziert ist
Route::get('/check-auth', function (Request $request) {
    return response()->json(Auth::check());
})->middleware('auth');

Route::get('/active-chats', [ChatbotController::class, 'getActiveChats'])->middleware('auth');

//Gibt User Details des aktuell eingeloogten Benutzers
Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth');

// Route für den Admin-Check
Route::middleware('auth')->get('/user-role', function (Request $request) {
    $user = $request->user();
    return response()->json([
        'role' => $user->getRoleNames() // Diese Methode gibt die Rollen des Benutzers zurück
    ]);
});

Route::get('/chats/updates', [ChatbotController::class, 'getUpdatedChats'])->middleware('auth');

//Chatbot
Route::post('/chatbot/input', [ChatbotController::class, 'handleInput']);

Route::post('/chatbot/test-input', function (Request $request) {
    // Simuliere eine einfache Antwort
    return response()->json([
        'messages' => [
            ['from' => 'bot', 'text' => 'This is a test response.']
        ],
        'session_id' => $request->header('X-Session-ID', 'test-session-id'),
    ]);
})->middleware('auth');

Route::post('/chatbot/input/anonymous', [ChatbotController::class, 'handleInputAnonymous']);
Route::post('/chatbot/end_chatbotSession', [ChatbotController::class, 'end_chatbotSession']);
Route::post('/chatbot/notification-status', [ChatbotController::class, 'saveNotificationStatus']);

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::middleware(['auth'])->group(function () {

    // Chatbot routes for authenticated users
    Route::prefix('chatbot')->group(function () {
        Route::post('/input', [ChatbotController::class, 'handleInput']);
        Route::post('/end_chatbotSession', [ChatbotController::class, 'end_chatbotSession']);

        Route::get('/chat-status', [ChatbotController::class, 'getChatStatus']);

        Route::post('/accept-chat/{chat}', [ChatRequestController::class, 'accept']);
    });

});

Route::post('/chatbot/send-message', [ChatbotController::class, 'sendAgentMessage']);
// Pusher
Route::post('messages', [MessagePusherController::class, 'message']);

Route::post('/chatbot/end-by-user', [ChatbotController::class, 'endChatByUser']);

Route::post('/human', [ChatbotController::class, 'requestHuman']);

Route::middleware(['auth'])->group(function () {
    Route::post('/push-subscriptions', [PushSubscriptionController::class, 'store']);
    Route::delete('/push-subscriptions/{token}', [PushSubscriptionController::class, 'destroy'])
        ->where('token', '.*');
    Route::delete('/push-subscriptions/device/{deviceId}', [PushSubscriptionController::class, 'destroyByDevice']);
});

Route::middleware(['auth'])->group(function () {
    Route::get('/chat-history', [ChatbotController::class, 'getChatHistory']);

    // User profile management
    Route::get('/profile', [UserManagementController::class, 'getProfile']);
    Route::put('/profile', [UserManagementController::class, 'updateProfile']);
    Route::post('/profile/upload-image', [UserManagementController::class, 'uploadProfileImage']);
    Route::delete('/profile/remove-image', [UserManagementController::class, 'removeProfileImage']);
    Route::post('/password/change', [AuthController::class, 'changePassword']);

    // Customer routes
    Route::prefix('customer')->group(function () {
        Route::get('/profile', [CustomerController::class, 'getProfile']);
        Route::get('/chat-history', [CustomerController::class, 'getChatHistory']);
        Route::get('/dashboard-stats', [CustomerController::class, 'getDashboardStats']);
    })->middleware('role:User');

    // Staff management routes (Admin only)
    Route::prefix('admin')->middleware('role:Admin')->group(function () {
        Route::get('/staff', [UserManagementController::class, 'getStaffUsers']);
        Route::post('/staff', [UserManagementController::class, 'createStaffUser']);
        Route::put('/staff/{id}', [UserManagementController::class, 'updateStaffUser']);
        Route::delete('/staff/{id}', [UserManagementController::class, 'deleteStaffUser']);
    });

    // Close chat
    Route::post('/chat/{chat}/close', [ChatbotController::class, 'closeChat'])
        ->middleware('role:Admin|Agent');

    // Transfer chat
    Route::post('/chat/{chat}/transfer', [ChatbotController::class, 'transferChat'])
        ->middleware('role:Admin');
});

Route::get('/admin/chats', [ChatbotController::class, 'getAllChatsForAdmin'])
    ->middleware('role:Admin');

// In api.php
Route::middleware(['auth'])->group(function () {
    Route::get('/chat/requests', [ChatRequestController::class, 'index']);
    Route::post('/chat/{chat}/accept', [ChatRequestController::class, 'accept']);
});

// Besucher-Details anhand session_id abrufen (GET)
Route::get('/visitorDetails/{session_id}', [VisitorController::class, 'getVisitorDetails'])->middleware('auth');

Route::post('/messages/mark-as-read', [ChatbotController::class, 'markMessagesAsRead'])->middleware('auth');

//Buchungen
Route::prefix('bookings')->group(function () {
    Route::get('/', [BookingController::class, 'index']); // Admin: Alle Buchungen
    Route::get('/user-booking', [BookingController::class, 'getUserBookings']); // User: Eigene Buchungen
    Route::get('/{booking}', [BookingController::class, 'show']); // Buchungsdetails
    Route::put('/{booking}/status', [BookingController::class, 'updateStatus']); // Status ändern
});

//Chatbot Response hinzufügen
Route::post('insert-chatbotresponse', [ChatbotResponses::class, 'insertChatbotResponse'])->middleware('auth');

Route::get('get-chatbotresponses', [ChatbotResponses::class, 'getTrainedData']);
Route::delete('delete-chatbotresponse/{id}', [ChatbotResponses::class, 'deleteChatbotResponse']);

Route::put('update-chatbotresponse/{id}', [ChatbotResponses::class, 'updateChatbotResponse']);

//Besucher registrieren
Route::post('register-visitor', [ChatbotController::class, 'registerVisitor']);
Route::get('check-registration/{sessionId}', [ChatbotController::class, 'checkVisitorRegistration']);

Route::post('/chats/mark-read', [ChatbotController::class, 'markMessagesAsRead']);

// ✅ Anonyme Benutzer Routen (ohne Auth-Middleware)
Route::post('/send-to-human-chat', [ChatbotController::class, 'sendToHumanChat']);
Route::post('/escalation-prompt/response', [ChatbotController::class, 'handleEscalationPromptResponse']);

// ✅ Assignment Status auch für anonyme Benutzer verfügbar machen
Route::get('/chats/{chatId}/assignment-status', [ChatAssignmentController::class, 'getAssignmentStatus']);

// Chat Assignment & Transfer Routes (nur für authentifizierte Benutzer)
Route::middleware(['auth'])->group(function () {
    // Chat Assignment
    Route::post('/chats/{chatId}/assign', [ChatAssignmentController::class, 'assignChat']);
    Route::post('/chats/{chatId}/transfer', [ChatAssignmentController::class, 'transferChat']);
    Route::post('/chats/{chatId}/unassign', [ChatAssignmentController::class, 'unassignChat']);

    // Escalation Prompts (nur für Agents)
    Route::post('/chats/{chatId}/escalation-prompt', [ChatAssignmentController::class, 'sendEscalationPrompt']);
    Route::post('/escalation-response', [ChatAssignmentController::class, 'respondToEscalationPrompt']);

    // Transfer History & Permissions (nur für authentifizierte Benutzer)
    Route::get('/chats/{chatId}/can-write', [ChatbotController::class, 'canUserWrite']);
    Route::get('/chats/{chatId}/transfer-history', [ChatAssignmentController::class, 'getTransferHistory']);

    // Available Agents
    Route::get('/chat-assignment/available-agents', [ChatAssignmentController::class, 'getAvailableAgents']);

});
Route::post('/reset-chat-assignment', [ChatbotController::class, 'resetChatAssignment']);
// ✅ Zusätzliche Route für anonyme Assignment Status Check
Route::get('/anonymous/chats/{sessionId}/status', [ChatbotController::class, 'getAnonymousChatStatus']);
Route::get('/chats/{chatId}/explicit-assignment-status', [ChatAssignmentController::class, 'getExplicitAssignmentStatus']);
Route::post('/close-chat-by-agent', [ChatbotController::class, 'endChatByAgent'])->middleware('auth');

// File Attachment Routes
Route::post('/attachments/upload', [MessageAttachmentController::class, 'uploadAttachment']);
Route::get('/attachments/{id}/download', [MessageAttachmentController::class, 'downloadAttachment']);
Route::get('/attachments/{id}', [MessageAttachmentController::class, 'getAttachment']);
Route::get('/chats/{chatId}/attachments', [MessageAttachmentController::class, 'getChatAttachments']);

Route::post('/broadcasting/auth/visitor', [BroadcastAuthController::class, 'authenticate']);

// Spezielle Broadcasting-Auth für Visitors
Route::post('/broadcasting/auth/visitor', function (Request $request) {
    $sessionId = $request->header('X-Session-ID');
    $channelName = $request->input('channel_name');
    $socketId = $request->input('socket_id');

    \Log::info('Visitor auth request:', [
        'session_id' => $sessionId,
        'channel' => $channelName,
        'socket_id' => $socketId
    ]);

    if (!$sessionId || !$channelName || !$socketId) {
        return response()->json(['error' => 'Missing parameters'], 403);
    }

    $expectedChannel = "private-chat.{$sessionId}";
    if ($channelName !== $expectedChannel) {
        return response()->json(['error' => 'Invalid channel'], 403);
    }

    // Chat und Visitor validation
    $chat = \App\Models\Chat::where('session_id', $sessionId)->first();
    $visitor = \App\Models\Visitor::where('session_id', $sessionId)->first();

    if (!$chat || !$visitor) {
        return response()->json(['error' => 'Chat or visitor not found'], 403);
    }

    // Pusher Authorization
    $pusher = new \Pusher\Pusher(
        config('broadcasting.connections.pusher.key'),
        config('broadcasting.connections.pusher.secret'),
        config('broadcasting.connections.pusher.app_id'),
        config('broadcasting.connections.pusher.options')
    );

    $auth = $pusher->authorizeChannel($channelName, $socketId);

    return response($auth, 200)
        ->header('Content-Type', 'application/json');

})->withoutMiddleware(['auth', 'auth:sanctum']);

/*
|--------------------------------------------------------------------------
| WhatsApp Business API Routes
|--------------------------------------------------------------------------
*/

// WhatsApp Webhook moved to web.php to bypass statefulApi middleware
// See routes/web.php for webhook routes

// WhatsApp Message Routes (für authentifizierte Agents)
Route::middleware(['auth'])->prefix('whatsapp')->group(function () {
    // Nachrichtenversand
    Route::post('/send-text', [WhatsAppMessageController::class, 'sendTextMessage']);
    Route::post('/send-image', [WhatsAppMessageController::class, 'sendImage']);
    Route::post('/send-document', [WhatsAppMessageController::class, 'sendDocument']);
    Route::post('/send-template', [WhatsAppMessageController::class, 'sendTemplate']);

    // WhatsApp Chats abrufen
    Route::get('/chats', [WhatsAppMessageController::class, 'getWhatsAppChats']);
});

/*
|--------------------------------------------------------------------------
| Offer Management Routes
|--------------------------------------------------------------------------
*/

// Public routes (für Homepage)
Route::get('/offers', [OfferController::class, 'index']);
Route::get('/offers/featured', [OfferController::class, 'featured']);
Route::get('/offers/active', [OfferController::class, 'active']);
Route::get('/offers/{id}', [OfferController::class, 'show']);

// Homepage statistics
Route::get('/homepage/statistics', [HomepageStatisticsController::class, 'show']);

// Admin routes (nur für authentifizierte Admins)
Route::middleware(['auth', 'role:Admin'])->prefix('admin/offers')->group(function () {
    Route::get('/', [OfferController::class, 'index']); // Alle Angebote (auch inaktive)
    Route::post('/', [OfferController::class, 'store']); // Neues Angebot erstellen
    Route::put('/{id}', [OfferController::class, 'update']); // Angebot bearbeiten
    Route::delete('/{id}', [OfferController::class, 'destroy']); // Angebot löschen
    Route::post('/{id}/toggle-featured', [OfferController::class, 'toggleFeatured']); // Hauptangebot setzen
});

/*
|--------------------------------------------------------------------------
| Appointment Management Routes
|--------------------------------------------------------------------------
*/

// Public appointment routes
Route::prefix('appointments')->group(function () {
    Route::post('/', [AppointmentController::class, 'store']);
    Route::get('/available-slots', [AppointmentController::class, 'getAvailableSlots']);
    Route::get('/blocked-slots', [AppointmentController::class, 'getBlockedSlots']);

        // Admin routes (authenticated users only)
        Route::middleware(['auth'])->group(function () {
            Route::get('/', [AppointmentController::class, 'index']);
            Route::post('/block', [AppointmentController::class, 'blockSlot']);
            Route::delete('/unblock/{id}', [AppointmentController::class, 'unblockSlot']);
            Route::post('/unblock-by-datetime', [AppointmentController::class, 'unblockSlotByDateTime']);
            Route::post('/unblock-multiple', [AppointmentController::class, 'unblockMultipleSlots']);
            Route::patch('/{id}/status', [AppointmentController::class, 'updateStatus']);
            Route::post('/{id}/release', [AppointmentController::class, 'releaseAppointment']);
            Route::post('/{id}/restore', [AppointmentController::class, 'restoreAppointment']);
        });
});
