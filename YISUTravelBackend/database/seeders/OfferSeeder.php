<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Offer;

class OfferSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Hauptangebot (Featured)
        Offer::create([
            'title' => 'Yalihan Aspendos',
            'description' => 'Entdecken Sie die Schönheit von Alanya, der Perle der Türkischen Riviera! Genießen Sie einen unvergesslichen Urlaub im Yalihan Aspendos, direkt am feinsandigen Strand. Perfekt für Familien und Paare, die Komfort und Entspannung suchen.',
            'location' => 'Alanya / Türkei',
            'image_url' => '/reiseziele/thailand.jpg',
            'price' => 437.00,
            'currency' => 'EUR',
            'rating' => 4,
            'badge' => 'Top-Angebot',
            'highlights' => [
                '🌴 Wunderschöne Strandlage',
                '🍹 All-Inclusive-Optionen',
                '✈️ Flug & Transfer inklusive',
                '⭐ Top-Bewertungen von Gästen'
            ],
            'duration' => '7 Tage',
            'inclusions' => 'Flug + Transfer, All Inclusive',
            'is_featured' => true,
            'is_active' => true,
            'sort_order' => 1
        ]);

        // Weitere Angebote
        Offer::create([
            'title' => 'Dreams Palm Beach Punta Cana',
            'description' => 'Luxuriöser Urlaub in der Karibik! Erleben Sie paradiesische Strände, kristallklares Wasser und erstklassigen Service in diesem 5-Sterne-Resort.',
            'location' => 'Punta Cana / Dominikanische Republik',
            'image_url' => '/reiseziele/dominikanische-republik.jpg',
            'price' => 1299.00,
            'currency' => 'EUR',
            'rating' => 5,
            'badge' => 'Premium',
            'highlights' => [
                '🏖️ Privatstrand mit weißem Sand',
                '🍽️ 10 Restaurants zur Auswahl',
                '🏊 Infinity-Pools mit Meerblick',
                '🏨 Luxuriöse Suiten'
            ],
            'duration' => '10 Tage',
            'inclusions' => 'Flug, Transfer, All Inclusive Premium',
            'is_featured' => false,
            'is_active' => true,
            'sort_order' => 2
        ]);

        Offer::create([
            'title' => 'Hotel Riu Palace Maspalomas',
            'description' => 'Entspannung pur auf Gran Canaria! Genießen Sie die Sonne Spaniens in diesem eleganten Resort mit direktem Strandzugang.',
            'location' => 'Maspalomas / Gran Canaria',
            'image_url' => '/reiseziele/gran-canaria.jpg',
            'price' => 699.00,
            'currency' => 'EUR',
            'rating' => 4,
            'badge' => 'Bestseller',
            'highlights' => [
                '☀️ 300 Sonnentage im Jahr',
                '🏖️ Dünen von Maspalomas',
                '🍷 Spanische Gastronomie',
                '🏊 Mehrere Swimmingpools'
            ],
            'duration' => '8 Tage',
            'inclusions' => 'Flug, Transfer, All Inclusive',
            'is_featured' => false,
            'is_active' => true,
            'sort_order' => 3
        ]);

        Offer::create([
            'title' => 'Club Med Phuket',
            'description' => 'Exotisches Thailand erleben! Entdecken Sie die Kultur, Strände und Gastfreundschaft Thailands in diesem familienfreundlichen Resort.',
            'location' => 'Phuket / Thailand',
            'image_url' => '/reiseziele/thailand.jpg',
            'price' => 899.00,
            'currency' => 'EUR',
            'rating' => 4,
            'badge' => 'Exotisch',
            'highlights' => [
                '🌊 Traumhafte Buchten',
                '🏝️ Inselhopping inklusive',
                '🍜 Authentische Thai-Küche',
                '🧘 Wellness & Entspannung'
            ],
            'duration' => '12 Tage',
            'inclusions' => 'Flug, Transfer, All Inclusive',
            'is_featured' => false,
            'is_active' => true,
            'sort_order' => 4
        ]);

        Offer::create([
            'title' => 'Sensimar Resort & Spa',
            'description' => 'Romantischer Urlaub für Paare! Erleben Sie unvergessliche Momente in diesem exklusiven Adults-Only Resort mit Meerblick.',
            'location' => 'Rhodos / Griechenland',
            'image_url' => '/reiseziele/griechenland.jpg',
            'price' => 549.00,
            'currency' => 'EUR',
            'rating' => 5,
            'badge' => 'Romantisch',
            'highlights' => [
                '💕 Adults-Only Resort',
                '🌅 Sonnenuntergänge über dem Meer',
                '🍽️ Gourmet-Restaurants',
                '💆 Luxus Spa & Wellness'
            ],
            'duration' => '7 Tage',
            'inclusions' => 'Flug, Transfer, All Inclusive',
            'is_featured' => false,
            'is_active' => true,
            'sort_order' => 5
        ]);
    }
}
