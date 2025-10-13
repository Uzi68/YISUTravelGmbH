<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WhatsAppWebhookController;

Route::get('/', function () {
    return view('welcome');
});
