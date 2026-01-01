<?php

namespace App\Http\Controllers;

use App\Models\MetricCounter;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class HomepageStatisticsController extends Controller
{
    /**
     * The counters handled by this endpoint.
     *
     * @var array<string, array<string, mixed>>
     */
    private array $metrics = [
        'bookings' => [
            'seed' => 200_000,
            'increment_range' => ['min' => 9, 'max' => 12],
        ],
        'happyCustomers' => [
            'seed' => 30_000,
            'increment_range' => ['min' => 3, 'max' => 4],
        ],
    ];

    public function show(): JsonResponse
    {
        $today = Carbon::today();
        $payload = [];

        foreach ($this->metrics as $key => $config) {
            $counter = MetricCounter::firstOrCreate(
                ['key' => $key],
                [
                    'total' => $config['seed'],
                    'today_increment' => 0,
                    'last_increment_date' => $today->copy()->subDay(),
                ]
            );

            $counter->total = max($counter->total, $config['seed']);

            if (!$counter->last_increment_date || !$counter->last_increment_date->isSameDay($today)) {
                $range = $config['increment_range'];
                $increment = random_int($range['min'], $range['max']);
                $counter->total += $increment;
                $counter->today_increment = $increment;
                $counter->last_increment_date = $today;
                $counter->save();
            }

            $payload[$key] = [
                'total' => (int) $counter->total,
                'todayIncrement' => (int) $counter->today_increment,
            ];
        }

        return response()->json($payload);
    }
}

