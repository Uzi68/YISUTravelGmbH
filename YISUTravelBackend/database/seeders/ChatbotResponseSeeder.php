<?php

namespace Database\Seeders;

use App\Models\ChatbotResponse;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ChatbotResponseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run()
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        // Löscht alle vorhandenen Einträge
        DB::table('chatbot_responses')->truncate();
        // Temporär Foreign Key Constraints deaktivieren


        // Zuerst abhängige Tabelle leeren
        DB::table('chatbot_options')->truncate();
        DB::table('chatbot_responses')->truncate();

        // Constraints wieder aktivieren
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // Antworteinträge, die eingefügt werden sollen
        $responses = [
            // Begrüßungen
            ['input' => 'hallo', 'response' => 'Willkommen! Wie kann ich helfen?', 'keywords' => json_encode(['hallo', 'hi', 'guten morgen', 'guten tag', 'guten abend', 'hey'])],
            ['input' => 'hi', 'response' => 'Hallo! Schön, dich zu sehen.', 'keywords' => json_encode(['hallo', 'hi', 'guten morgen', 'guten tag', 'guten abend', 'hey'])],
            ['input' => 'guten morgen', 'response' => 'Guten Morgen! Wie kann ich Ihnen heute helfen?', 'keywords' => json_encode(['guten morgen'])],
            ['input' => 'guten tag', 'response' => 'Guten Tag! Wie kann ich Ihnen heute helfen?', 'keywords' => json_encode(['guten tag'])],
            ['input' => 'guten abend', 'response' => 'Guten Abend! Was kann ich für Sie tun?', 'keywords' => json_encode(['guten abend'])],
            ['input' => 'hey', 'response' => 'Hey! Was kann ich für dich tun?', 'keywords' => json_encode(['hey'])],

            // Danksagungen
            ['input' => 'danke', 'response' => 'Gern geschehen! Ich freue mich, dir zu helfen.', 'keywords' => json_encode(['danke'])],
            ['input' => 'vielen dank', 'response' => 'Kein Problem, ich bin gerne für dich da.', 'keywords' => json_encode(['vielen dank'])],
            ['input' => 'dankeschön', 'response' => 'Sehr gerne!', 'keywords' => json_encode(['dankeschön'])],

            // Hilfe-Anfragen
            ['input' => 'wie kann ich dir helfen', 'response' => 'Ich kann dir bei einer Vielzahl von Anfragen helfen. Frag mich einfach!', 'keywords' => json_encode(['wie kann ich dir helfen'])],
            ['input' => 'was kannst du tun', 'response' => 'Ich kann dir bei allgemeinen Anfragen, Öffnungszeiten, Dienstleistungen und mehr helfen.', 'keywords' => json_encode(['was kannst du tun'])],
            ['input' => 'hilfe', 'response' => 'Natürlich! Was genau brauchst du?', 'keywords' => json_encode(['hilfe'])],
            ['input' => 'kannst du mir helfen?', 'response' => 'Ja, auf jeden Fall! Was kann ich für dich tun?', 'keywords' => json_encode(['kannst du mir helfen'])],

            // Allgemeine Fragen
            ['input' => 'wie geht es dir', 'response' => 'Mir geht es gut, danke der Nachfrage! Wie kann ich dir helfen?', 'keywords' => json_encode(['wie geht es dir', 'wie gehts', 'was geht', 'was läuft'])],
            ['input' => 'wie gehts', 'response' => 'Mir geht es gut, danke der Nachfrage! Wie kann ich dir helfen?', 'keywords' => json_encode(['wie geht es dir', 'wie gehts', 'was geht', 'was läuft'])],
            ['input' => 'was geht', 'response' => 'Mir geht es gut, danke der Nachfrage! Wie kann ich dir helfen?', 'keywords' => json_encode(['wie geht es dir', 'wie gehts', 'was geht', 'was läuft'])],
            ['input' => 'was läuft', 'response' => 'Mir geht es gut, danke der Nachfrage! Wie kann ich dir helfen?', 'keywords' => json_encode(['wie geht es dir', 'wie gehts', 'was geht', 'was läuft'])],
            ['input' => 'was ist dein name', 'response' => 'Ich bin ein Chatbot, aber du kannst mir gerne einen Namen geben!', 'keywords' => json_encode(['was ist dein name'])],
            ['input' => 'wer bist du', 'response' => 'Ich bin ein Chatbot, entwickelt, um dir zu helfen.', 'keywords' => json_encode(['wer bist du'])],
            ['input' => 'was machst du', 'response' => 'Ich bin dafür da, dir bei deinen Fragen und Anliegen zu helfen.', 'keywords' => json_encode(['was machst du'])],
            ['input' => 'bist du ein mensch?', 'response' => 'Nein, ich bin ein KI-Chatbot, aber ich bin hier, um dir zu helfen!', 'keywords' => json_encode(['bist du ein mensch'])],

            // Unternehmensbezogene Anfragen
            ['input' => 'was ist dein service', 'response' => 'Wir bieten viele Dienstleistungen an, darunter Beratung und Unterstützung in verschiedenen Bereichen.', 'keywords' => json_encode(['was ist dein service', 'service'])],
            ['input' => 'wie kann ich einen termin buchen', 'response' => 'Du kannst einfach einen Termin über unsere Website buchen oder mich nach verfügbaren Zeiten fragen.', 'keywords' => json_encode(['wie kann ich einen termin buchen'])],
            ['input' => 'Öffnungszeiten', 'response' => 'Wir sind von Montag bis Freitag von 9:00 bis 18:00 Uhr geöffnet.', 'keywords' => json_encode(['öffnungszeiten'])],
            ['input' => 'was kostet ein termin', 'response' => 'Die Preise variieren je nach Dienstleistung. Kontaktiere uns für genauere Informationen.', 'keywords' => json_encode(['was kostet ein termin'])],
            ['input' => 'wie kann ich bezahlen', 'response' => 'Wir akzeptieren verschiedene Zahlungsmethoden, darunter Kreditkarten, PayPal und Banküberweisungen.', 'keywords' => json_encode(['wie kann ich bezahlen'])],
            ['input' => 'wie lange dauert es bis mein termin bestätigt wird?', 'response' => 'Normalerweise bestätigen wir Termine innerhalb von 24 Stunden.', 'keywords' => json_encode(['wie lange dauert es bis mein termin bestätigt wird?'])],
            ['input' => 'gibt es rabatte?', 'response' => 'Wir bieten gelegentlich Rabatte und Sonderaktionen an. Bleib dran!', 'keywords' => json_encode(['gibt es rabatte'])],

            // Fragen zur Webseite und zum System
            ['input' => 'wie kann ich mich anmelden', 'response' => 'Du kannst dich über unser Anmeldeformular auf der Webseite anmelden.', 'keywords' => json_encode(['wie kann ich mich anmelden'])],
            ['input' => 'habe ich ein konto', 'response' => 'Ich kann dir helfen, ein Konto zu erstellen oder dich anzumelden, falls du schon eins hast.', 'keywords' => json_encode(['habe ich ein konto'])],
            ['input' => 'passwort vergessen', 'response' => 'Kein Problem, wir können dir helfen, dein Passwort zurückzusetzen. Folge einfach den Anweisungen auf der Seite.', 'keywords' => json_encode(['passwort vergessen'])],
            ['input' => 'wie kann ich mein profil bearbeiten', 'response' => 'Gehe zu deinem Profilbereich und klicke auf „Bearbeiten“. Dort kannst du deine Informationen aktualisieren.', 'keywords' => json_encode(['wie kann ich mein profil bearbeiten'])],

            // Abwesenheit und Entschuldigungen
            ['input' => 'du bist beschäftigt', 'response' => 'Ich bin immer bereit, dir zu helfen!', 'keywords' => json_encode(['du bist beschäftigt'])],
            ['input' => 'es tut mir leid', 'response' => 'Kein Problem! Was kann ich für dich tun?', 'keywords' => json_encode(['es tut mir leid'])],
            ['input' => 'ich verstehe nicht', 'response' => 'Kein Problem! Ich kann es gerne noch einmal erklären.', 'keywords' => json_encode(['ich verstehe nicht'])],
            ['input' => 'kannst du das wiederholen?', 'response' => 'Natürlich! Was genau möchtest du, dass ich wiederhole?', 'keywords' => json_encode(['kannst du das wiederholen?'])],
            ['input' => 'ich habe das nicht verstanden', 'response' => 'Es tut mir leid, wenn das unklar war. Lass mich es anders erklären.', 'keywords' => json_encode(['ich habe das nicht verstanden'])],

            // Entschuldigung für unverständliche Eingaben
            ['input' => 'blabla', 'response' => 'Entschuldigung, ich habe das nicht ganz verstanden. Kannst du das anders formulieren?', 'keywords' => json_encode(['blabla'])],
            ['input' => 'ich weiß nicht', 'response' => 'Kein Problem! Frag mich einfach etwas anderes.', 'keywords' => json_encode(['ich weiß nicht'])],

            // Verabschiedungen
            ['input' => 'tschüss', 'response' => 'Auf Wiedersehen! Ich hoffe, wir sprechen bald wieder.', 'keywords' => json_encode(['tschüss'])],
            ['input' => 'bis bald', 'response' => 'Bis bald! Es war schön, mit dir zu sprechen.', 'keywords' => json_encode(['bis bald'])],
            ['input' => 'mach’s gut', 'response' => 'Mach’s gut! Ich wünsche dir einen schönen Tag.', 'keywords' => json_encode(['mach’s gut'])],
            ['input' => 'auf wiedersehen', 'response' => 'Auf Wiedersehen! Es war mir eine Freude, dir zu helfen.', 'keywords' => json_encode(['auf wiedersehen'])],
            ['input' => 'gute nacht', 'response' => 'Gute Nacht! Schlaf gut und bis bald!', 'keywords' => json_encode(['gute nacht'])],

            // Feedback und Bewertungen
            ['input' => 'wie fandest du den service?', 'response' => 'Ich hoffe, dir hat unser Service gefallen! Falls nicht, lass es mich wissen.', 'keywords' => json_encode(['wie fandest du den service?'])],
            ['input' => 'wie kann ich bewerten?', 'response' => 'Du kannst uns eine Bewertung auf unserer Website hinterlassen.', 'keywords' => json_encode(['wie kann ich bewerten?'])],
            ['input' => 'war der service gut?', 'response' => 'Ich hoffe, du warst zufrieden. Lass uns wissen, wenn wir noch etwas verbessern können!', 'keywords' => json_encode(['war der service gut?'])],


            // Falls der Besucher nach einem Mitarbeiter fragt
            ['input' => 'mitarbeiter', 'response' => 'Möchten Sie mit einem Mitarbeiter sprechen?', 'keywords' => json_encode([
                'mitarbeiter', 'mitarbeiterin', 'berater', 'support', 'agent',
                'person', 'human', 'team', 'kundenservice', 'service', 'sprechen'
            ])],

            // FAQs und Support
            ['input' => 'häufige fragen', 'response' => 'Unsere häufigsten Fragen findest du auf der FAQ-Seite.', 'keywords' => json_encode(['häufige fragen'])],
            ['input' => 'wie kann ich support kontaktieren', 'response' => 'Du kannst uns über das Kontaktformular erreichen (https://yisu-travel.de/kontakt)' . PHP_EOL . ' ' . PHP_EOL . 'oder uns direkt anrufen.' . PHP_EOL . 'Mobil: 0172 7049131' . PHP_EOL . 'Tel.: 06181 4341810', 'keywords' => json_encode(['wie kann ich support kontaktieren', 'support', 'kontakt'])],
            ['input' => 'Ich möchte mit dem Bot fortfahren', 'response' => 'Super! Wie kann ich dir weiterhelfen?', 'keywords' => json_encode(['fortfahren', 'Ich möchte mit dem Bot fortfahren'])],
            ['input' => 'Ok', 'response' => 'Super! Wie kann ich dir weiterhelfen?', 'keywords' => json_encode(['ok', 'alles klar', 'kontakt'])],




            // Türkisch
                // Selamlama
            ['input' => 'merhaba', 'response' => 'Hoş geldiniz! Nasıl yardımcı olabilirim?', 'keywords' => json_encode(['merhaba', 'selam', 'günaydın', 'iyi günler', 'iyi akşamlar', 'hey'])],
            ['input' => 'selam', 'response' => 'Merhaba! Seni görmek güzel.', 'keywords' => json_encode(['merhaba', 'selam', 'günaydın', 'iyi günler', 'iyi akşamlar', 'hey'])],
            ['input' => 'günaydın', 'response' => 'Günaydın! Bugün size nasıl yardımcı olabilirim?', 'keywords' => json_encode(['günaydın'])],
            ['input' => 'iyi günler', 'response' => 'İyi günler! Bugün size nasıl yardımcı olabilirim?', 'keywords' => json_encode(['iyi günler'])],
            ['input' => 'iyi akşamlar', 'response' => 'İyi akşamlar! Sizin için ne yapabilirim?', 'keywords' => json_encode(['iyi akşamlar'])],

            // Teşekkür
            ['input' => 'teşekkürler', 'response' => 'Rica ederim! Sana yardım etmekten mutluluk duyuyorum.', 'keywords' => json_encode(['teşekkürler'])],
            ['input' => 'çok teşekkürler', 'response' => 'Problem değil, senin için buradayım.', 'keywords' => json_encode(['çok teşekkürler'])],
            ['input' => 'sağ ol', 'response' => 'Rica ederim!', 'keywords' => json_encode(['sağ ol'])],

            // Yardım istekleri
            ['input' => 'nasıl yardımcı olabilirim', 'response' => 'Çeşitli konularda sana yardımcı olabilirim. Bana sadece sor!', 'keywords' => json_encode(['nasıl yardımcı olabilirim'])],
            ['input' => 'ne yapabilirsin', 'response' => 'Genel sorular, çalışma saatleri, hizmetler ve daha fazlası konusunda sana yardımcı olabilirim.', 'keywords' => json_encode(['ne yapabilirsin'])],
            ['input' => 'yardım', 'response' => 'Tabii ki! Tam olarak neye ihtiyacın var?', 'keywords' => json_encode(['yardım'])],
            ['input' => 'bana yardım edebilir misin?', 'response' => 'Evet, kesinlikle! Senin için ne yapabilirim?', 'keywords' => json_encode(['bana yardım edebilir misin'])],

            // Genel sorular
            ['input' => 'nasılsın', 'response' => 'İyiyim, sorma! Nasıl yardımcı olabilirim?', 'keywords' => json_encode(['nasılsın', 'nasıl gidiyor', 'ne haber', 'neler oluyor'])],
            ['input' => 'nasıl gidiyor', 'response' => 'İyiyim, sorma! Nasıl yardımcı olabilirim?', 'keywords' => json_encode(['nasılsın', 'nasıl gidiyor', 'ne haber', 'neler oluyor'])],
            ['input' => 'ne haber', 'response' => 'İyiyim, sorma! Nasıl yardımcı olabilirim?', 'keywords' => json_encode(['nasılsın', 'nasıl gidiyor', 'ne haber', 'neler oluyor'])],
            ['input' => 'neler oluyor', 'response' => 'İyiyim, sorma! Nasıl yardımcı olabilirim?', 'keywords' => json_encode(['nasılsın', 'nasıl gidiyor', 'ne haber', 'neler oluyor'])],
            ['input' => 'adın ne', 'response' => 'Ben bir chatbotum, ama bana bir isim vermekten çekinme!', 'keywords' => json_encode(['adın ne'])],
            ['input' => 'sen kimsin', 'response' => 'Sana yardım etmek için geliştirilmiş bir chatbotum.', 'keywords' => json_encode(['sen kimsin'])],
            ['input' => 'ne yapıyorsun', 'response' => 'Sorularını ve ihtiyaçlarını karşılamak için buradayım.', 'keywords' => json_encode(['ne yapıyorsun'])],
            ['input' => 'insan mısın?', 'response' => 'Hayır, ben bir AI chatbotuyum, ama sana yardım etmek için buradayım!', 'keywords' => json_encode(['insan mısın'])],

            // Şirketle ilgili istekler
            ['input' => 'hizmetiniz nedir', 'response' => 'Birçok hizmet sunuyoruz, danışmanlık ve çeşitli alanlarda destek dahil.', 'keywords' => json_encode(['hizmetiniz nedir', 'hizmet'])],
            ['input' => 'nasıl randevu alabilirim', 'response' => 'Web sitemiz üzerinden kolayca randevu alabilir veya bana müsait zamanları sorabilirsin.', 'keywords' => json_encode(['nasıl randevu alabilirim'])],
            ['input' => 'çalışma saatleri', 'response' => 'Pazartesiden Cuma\'ya 09:00 - 18:00 saatleri arasında açığız.', 'keywords' => json_encode(['çalışma saatleri'])],
            ['input' => 'randevu ücreti ne kadar', 'response' => 'Fiyatlar hizmete göre değişir. Daha kesin bilgi için bize ulaşın.', 'keywords' => json_encode(['randevu ücreti ne kadar'])],
            ['input' => 'nasıl ödeme yapabilirim', 'response' => 'Kredi kartları, PayPal ve banka havalesi dahil çeşitli ödeme yöntemlerini kabul ediyoruz.', 'keywords' => json_encode(['nasıl ödeme yapabilirim'])],
            ['input' => 'randevumun onaylanması ne kadar sürer?', 'response' => 'Normalde randevuları 24 saat içinde onaylıyoruz.', 'keywords' => json_encode(['randevumun onaylanması ne kadar sürer?'])],
            ['input' => 'indirim var mı?', 'response' => 'Ara sıra indirimler ve özel kampanyalar sunuyoruz. Bizi takip et!', 'keywords' => json_encode(['indirim var mı'])],

            // Web sitesi ve sistem soruları
            ['input' => 'nasıl kayıt olabilirim', 'response' => 'Web sitesindeki kayıt formumuz üzerinden kayıt olabilirsin.', 'keywords' => json_encode(['nasıl kayıt olabilirim'])],
            ['input' => 'hesabım var mı', 'response' => 'Zaten bir hesabın varsa giriş yapmana veya yeni bir hesap oluşturmana yardımcı olabilirim.', 'keywords' => json_encode(['hesabım var mı'])],
            ['input' => 'şifremi unuttum', 'response' => 'Problem değil, şifreni sıfırlamana yardımcı olabiliriz. Sadece sayfadaki talimatları izle.', 'keywords' => json_encode(['şifremi unuttum'])],
            ['input' => 'profilimi nasıl düzenleyebilirim', 'response' => 'Profil bölümüne git ve "Düzenle"ye tıkla. Orada bilgilerini güncelleyebilirsin.', 'keywords' => json_encode(['profilimi nasıl düzenleyebilirim'])],

            // Müsait olmama ve özürler
            ['input' => 'meşgulsün', 'response' => 'Sana yardım etmeye her zaman hazırım!', 'keywords' => json_encode(['meşgulsün'])],
            ['input' => 'özür dilerim', 'response' => 'Problem değil! Senin için ne yapabilirim?', 'keywords' => json_encode(['özür dilerim'])],
            ['input' => 'anlamadım', 'response' => 'Problem değil! Tekrar açıklayabilirim.', 'keywords' => json_encode(['anlamadım'])],
            ['input' => 'tekrarlayabilir misin?', 'response' => 'Tabii ki! Tam olarak neyi tekrarlamamı istiyorsun?', 'keywords' => json_encode(['tekrarlayabilir misin?'])],
            ['input' => 'bunu anlamadım', 'response' => 'Eğer bu net değilse özür dilerim. Farklı şekilde açıklayayım.', 'keywords' => json_encode(['bunu anlamadım'])],

            // Anlaşılamayan girdiler için özür
            ['input' => 'bilmiyorum', 'response' => 'Problem değil! Bana başka bir şey sor.', 'keywords' => json_encode(['bilmiyorum'])],
            ['input' => 'bunu açıklayabilir misin?', 'response' => 'Tabii, sana açıklayayım!', 'keywords' => json_encode(['bunu açıklayabilir misin?'])],

            // Vedalaşma
            ['input' => 'hoşçakal', 'response' => 'Güle güle! Yakında tekrar konuşuruz umarım.', 'keywords' => json_encode(['hoşçakal'])],
            ['input' => 'görüşürüz', 'response' => 'Görüşürüz! Seninle konuşmak güzeldi.', 'keywords' => json_encode(['görüşürüz'])],
            ['input' => 'kendine iyi bak', 'response' => 'Kendine iyi bak! İyi günler dilerim.', 'keywords' => json_encode(['kendine iyi bak'])],
            ['input' => 'allah\'a ısmarladık', 'response' => 'Allah\'a ısmarladık! Sana yardım etmek bir zevkti.', 'keywords' => json_encode(['allah\'a ısmarladık'])],
            ['input' => 'iyi geceler', 'response' => 'İyi geceler! İyi uyu ve görüşürüz!', 'keywords' => json_encode(['iyi geceler'])],

            // Geri bildirim ve değerlendirmeler
            ['input' => 'hizmeti nasıl buldun?', 'response' => 'Umarım hizmetimizden memnun kalmışsındır! Değilse, lütfen bana bildir.', 'keywords' => json_encode(['hizmeti nasıl buldun?'])],
            ['input' => 'nasıl değerlendirebilirim?', 'response' => 'Web sitemizde bize bir değerlendirme bırakabilirsin.', 'keywords' => json_encode(['nasıl değerlendirebilirim?'])],
            ['input' => 'hizmet iyi miydi?', 'response' => 'Umarım memnun kalmışsındır. Daha iyileştirebileceğimiz bir şey varsa bize bildir!', 'keywords' => json_encode(['hizmet iyi miydi?'])],

            // Ziyaretçi personel isterse
            ['input' => 'personel', 'response' => 'Bir personelle mi konuşmak istiyorsunuz?', 'keywords' => json_encode([
                'personel', 'çalışan', 'danışman', 'destek', 'ajan',
                'kişi', 'insan', 'ekip', 'müşteri hizmetleri', 'hizmet', 'konuşmak'
            ])],

            // SSS ve Destek
            ['input' => 'sıkça sorulan sorular', 'response' => 'En sık sorulan soruları SSS sayfamızda bulabilirsin.', 'keywords' => json_encode(['sıkça sorulan sorular'])],
            ['input' => 'destek ile nasıl iletişime geçebilirim', 'response' => 'Bize iletişim formu üzerinden ulaşabilir veya doğrudan arayabilirsin.', 'keywords' => json_encode(['destek ile nasıl iletişime geçebilirim', 'destek', 'iletişim'])],
            ['input' => 'Bot ile devam etmek istiyorum', 'response' => 'Süper! Sana nasıl yardımcı olabilirim?', 'keywords' => json_encode(['devam', 'Bot ile devam etmek istiyorum'])],
            ['input' => 'tamam', 'response' => 'Süper! Sana nasıl yardımcı olabilirim?', 'keywords' => json_encode(['tamam', 'anlaşıldı', 'iletişim'])]
        ];

            // Speichern in der Datenbank
            DB::table('chatbot_responses')->insert($responses);
    }
}
