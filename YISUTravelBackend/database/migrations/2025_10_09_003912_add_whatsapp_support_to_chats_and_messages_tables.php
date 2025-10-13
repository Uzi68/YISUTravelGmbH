<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add WhatsApp support to chats table
        Schema::table('chats', function (Blueprint $table) {
            if (!Schema::hasColumn('chats', 'channel')) {
                $table->string('channel')->default('website')->after('status')->comment('Channel: website, whatsapp');
            }
            if (!Schema::hasColumn('chats', 'whatsapp_number')) {
                $table->string('whatsapp_number')->nullable()->after('channel')->comment('WhatsApp phone number for WhatsApp chats');
            }

            // Add indexes only if they don't exist
            $whatsappNumberIndexExists = DB::select("SHOW INDEX FROM chats WHERE Key_name = 'chats_whatsapp_number_index'");
            if (empty($whatsappNumberIndexExists)) {
                $table->index('whatsapp_number');
            }

            $channelIndexExists = DB::select("SHOW INDEX FROM chats WHERE Key_name = 'chats_channel_index'");
            if (empty($channelIndexExists)) {
                $table->index('channel');
            }
        });

        // Add WhatsApp support to visitors table
        if (Schema::hasTable('visitors')) {
            Schema::table('visitors', function (Blueprint $table) {
                if (!Schema::hasColumn('visitors', 'whatsapp_number')) {
                    $table->string('whatsapp_number')->nullable()->after('phone')->comment('WhatsApp phone number');
                }
                if (!Schema::hasColumn('visitors', 'channel')) {
                    $table->string('channel')->default('website')->after('session_id')->comment('Channel: website, whatsapp');
                }

                // Add indexes only if they don't exist
                $whatsappNumberIndexExists = DB::select("SHOW INDEX FROM visitors WHERE Key_name = 'visitors_whatsapp_number_index'");
                if (empty($whatsappNumberIndexExists) && Schema::hasColumn('visitors', 'whatsapp_number')) {
                    $table->index('whatsapp_number');
                }

                $channelIndexExists = DB::select("SHOW INDEX FROM visitors WHERE Key_name = 'visitors_channel_index'");
                if (empty($channelIndexExists) && Schema::hasColumn('visitors', 'channel')) {
                    $table->index('channel');
                }
            });
        }

        // Messages table is already flexible with metadata field for WhatsApp-specific data
        // No changes needed, but we can add an index for better performance
        Schema::table('messages', function (Blueprint $table) {
            // Add message_type column if it doesn't exist
            if (!Schema::hasColumn('messages', 'message_type')) {
                $table->string('message_type')->nullable()->after('text')->comment('Type: text, whatsapp_text, whatsapp_image, whatsapp_document, etc.');
            }

            // Add index only if it doesn't exist
            $indexExists = DB::select("SHOW INDEX FROM messages WHERE Key_name = 'messages_message_type_index'");
            if (empty($indexExists)) {
                $table->index('message_type');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('chats', function (Blueprint $table) {
            // Drop indexes only if they exist
            $whatsappNumberIndexExists = DB::select("SHOW INDEX FROM chats WHERE Key_name = 'chats_whatsapp_number_index'");
            if (!empty($whatsappNumberIndexExists)) {
                $table->dropIndex(['whatsapp_number']);
            }

            $channelIndexExists = DB::select("SHOW INDEX FROM chats WHERE Key_name = 'chats_channel_index'");
            if (!empty($channelIndexExists)) {
                $table->dropIndex(['channel']);
            }

            // Drop columns only if they exist
            if (Schema::hasColumn('chats', 'channel')) {
                $table->dropColumn('channel');
            }
            if (Schema::hasColumn('chats', 'whatsapp_number')) {
                $table->dropColumn('whatsapp_number');
            }
        });

        if (Schema::hasTable('visitors')) {
            Schema::table('visitors', function (Blueprint $table) {
                // Drop indexes only if they exist
                $whatsappNumberIndexExists = DB::select("SHOW INDEX FROM visitors WHERE Key_name = 'visitors_whatsapp_number_index'");
                if (!empty($whatsappNumberIndexExists)) {
                    $table->dropIndex(['whatsapp_number']);
                }

                $channelIndexExists = DB::select("SHOW INDEX FROM visitors WHERE Key_name = 'visitors_channel_index'");
                if (!empty($channelIndexExists)) {
                    $table->dropIndex(['channel']);
                }

                // Drop columns only if they exist
                if (Schema::hasColumn('visitors', 'whatsapp_number')) {
                    $table->dropColumn('whatsapp_number');
                }
                if (Schema::hasColumn('visitors', 'channel')) {
                    $table->dropColumn('channel');
                }
            });
        }

        if (Schema::hasTable('messages')) {
            Schema::table('messages', function (Blueprint $table) {
                // Drop index only if it exists
                $indexExists = DB::select("SHOW INDEX FROM messages WHERE Key_name = 'messages_message_type_index'");
                if (!empty($indexExists)) {
                    $table->dropIndex(['message_type']);
                }
            });

            // Drop column separately to avoid conflicts
            Schema::table('messages', function (Blueprint $table) {
                if (Schema::hasColumn('messages', 'message_type')) {
                    $table->dropColumn('message_type');
                }
            });
        }
    }
};
