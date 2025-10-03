<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatbotResponse extends Model
{
    use HasFactory;
    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'input',
        'response',
        'keywords'
    ];
    protected $casts = [
        'keywords' => 'array'
    ];

    public function options()
    {
        return $this->hasMany(ChatbotOption::class);
    }

    /**
     * Scope for finding similar responses.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $input
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeFindSimilar($query, $input)
    {
        return $query->where('input', 'LIKE', "%$input%");
    }
}
