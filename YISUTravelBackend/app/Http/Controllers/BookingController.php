<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    public function index(Request $request)
    {
        $query = Booking::with(['chat', 'visitor'])
            ->orderBy('created_at', 'desc');

        // Filter nach Status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter nach Datum
        if ($request->has('date_from')) {
            $query->whereDate('travel_date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('travel_date', '<=', $request->date_to);
        }

        $bookings = $query->get();

        return response()->json([
            'success' => true,
            'bookings' => $bookings,
            'stats' => [
                'total' => Booking::count(),
                'confirmed' => Booking::where('status', 'confirmed')->count(),
                'cancelled' => Booking::where('status', 'cancelled')->count(),
                'pending' => Booking::where('status', 'pending')->count()
            ]
        ]);
    }

    public function show(Booking $booking)
    {
        $booking->load(['chat.messages', 'visitor']);

        return response()->json([
            'success' => true,
            'booking' => $booking
        ]);
    }

    public function updateStatus(Request $request, Booking $booking)
    {
        $validated = $request->validate([
            'status' => 'required|in:confirmed,cancelled,pending'
        ]);

        $booking->update(['status' => $validated['status']]);

        return response()->json([
            'success' => true,
            'message' => 'Buchungsstatus aktualisiert',
            'booking' => $booking
        ]);
    }

    public function getUserBookings(Request $request)
    {
        $sessionId = $request->header('X-Session-ID');

        $bookings = Booking::where('session_id', $sessionId)
            ->with(['chat'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'bookings' => $bookings
        ]);
    }
}
