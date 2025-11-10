<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MetricCounter extends Model
{
    protected $fillable = [
        'key',
        'total',
        'today_increment',
        'last_increment_date',
    ];

    protected $casts = [
        'last_increment_date' => 'date',
    ];
}

