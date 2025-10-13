-- Prüfen und reparieren der Messages-Tabelle für WhatsApp Migration
-- Führen Sie dies direkt in phpMyAdmin oder MySQL aus

-- 1. Prüfen ob message_type Spalte existiert
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE
FROM
    INFORMATION_SCHEMA.COLUMNS
WHERE
    TABLE_SCHEMA = 'dbs13622217'
    AND TABLE_NAME = 'messages'
    AND COLUMN_NAME = 'message_type';

-- 2. Wenn die Spalte NICHT existiert, fügen Sie sie hinzu:
-- ALTER TABLE messages ADD COLUMN message_type VARCHAR(255) NULL AFTER text COMMENT 'Type: text, whatsapp_text, whatsapp_image, etc.';

-- 3. Wenn die Spalte existiert ABER der Index fehlt, fügen Sie den Index hinzu:
-- ALTER TABLE messages ADD INDEX messages_message_type_index (message_type);

-- 4. Prüfen ob chats.channel existiert
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_DEFAULT
FROM
    INFORMATION_SCHEMA.COLUMNS
WHERE
    TABLE_SCHEMA = 'dbs13622217'
    AND TABLE_NAME = 'chats'
    AND COLUMN_NAME IN ('channel', 'whatsapp_number');

-- 5. Wenn channel NICHT existiert:
-- ALTER TABLE chats ADD COLUMN channel VARCHAR(255) NOT NULL DEFAULT 'website' AFTER status COMMENT 'Channel: website, whatsapp';
-- ALTER TABLE chats ADD COLUMN whatsapp_number VARCHAR(255) NULL AFTER channel COMMENT 'WhatsApp phone number';
-- ALTER TABLE chats ADD INDEX chats_channel_index (channel);
-- ALTER TABLE chats ADD INDEX chats_whatsapp_number_index (whatsapp_number);

-- 6. Prüfen ob visitors.whatsapp_number existiert
SELECT
    COLUMN_NAME,
    DATA_TYPE
FROM
    INFORMATION_SCHEMA.COLUMNS
WHERE
    TABLE_SCHEMA = 'dbs13622217'
    AND TABLE_NAME = 'visitors'
    AND COLUMN_NAME IN ('channel', 'whatsapp_number');

-- 7. Wenn NICHT existiert:
-- ALTER TABLE visitors ADD COLUMN whatsapp_number VARCHAR(255) NULL AFTER phone COMMENT 'WhatsApp phone number';
-- ALTER TABLE visitors ADD COLUMN channel VARCHAR(255) NOT NULL DEFAULT 'website' AFTER session_id COMMENT 'Channel: website, whatsapp';
-- ALTER TABLE visitors ADD INDEX visitors_whatsapp_number_index (whatsapp_number);
-- ALTER TABLE visitors ADD INDEX visitors_channel_index (channel);

-- ========================================
-- Alternative: Alles auf einmal hinzufügen
-- ========================================
-- Führen Sie dies NUR aus, wenn Sie sicher sind, dass die Spalten NICHT existieren:

/*
-- Messages Tabelle
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS message_type VARCHAR(255) NULL AFTER text COMMENT 'Type: text, whatsapp_text, whatsapp_image, etc.',
ADD INDEX IF NOT EXISTS messages_message_type_index (message_type);

-- Chats Tabelle
ALTER TABLE chats
ADD COLUMN IF NOT EXISTS channel VARCHAR(255) NOT NULL DEFAULT 'website' AFTER status COMMENT 'Channel: website, whatsapp',
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(255) NULL AFTER channel COMMENT 'WhatsApp phone number',
ADD INDEX IF NOT EXISTS chats_channel_index (channel),
ADD INDEX IF NOT EXISTS chats_whatsapp_number_index (whatsapp_number);

-- Visitors Tabelle
ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(255) NULL AFTER phone COMMENT 'WhatsApp phone number',
ADD COLUMN IF NOT EXISTS channel VARCHAR(255) NOT NULL DEFAULT 'website' AFTER session_id COMMENT 'Channel: website, whatsapp',
ADD INDEX IF NOT EXISTS visitors_whatsapp_number_index (whatsapp_number),
ADD INDEX IF NOT EXISTS visitors_channel_index (channel);
*/
