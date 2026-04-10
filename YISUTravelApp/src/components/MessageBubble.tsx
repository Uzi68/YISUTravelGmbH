import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking } from 'react-native';

export interface Attachment {
  id: number;
  file_name: string;
  file_type: string;  // 'image' | 'pdf' | 'document' | 'spreadsheet' | 'audio' | 'video' | 'other'
  file_size: number;
  download_url: string;
}

export interface Message {
  id: string;
  from: 'user' | 'bot' | 'agent' | 'system';
  text: string;
  timestamp?: Date;
  isOptimistic?: boolean;
  attachment?: Attachment;
}

interface Props {
  message: Message;
}

const YISA_AVATAR = require('../../assets/yisa_avatar.png');

function formatTime(date?: Date): string {
  if (!date) return '';
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileEmoji(fileType: string): string {
  switch (fileType) {
    case 'pdf':         return '📄';
    case 'spreadsheet': return '📊';
    case 'audio':       return '🎵';
    case 'video':       return '🎬';
    case 'document':    return '📝';
    default:            return '📎';
  }
}

function AttachmentView({ attachment, isUser }: { attachment: Attachment; isUser: boolean }) {
  const handlePress = () => {
    if (attachment.download_url) {
      Linking.openURL(attachment.download_url).catch(() => {});
    }
  };

  if (attachment.file_type === 'image') {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
        <Image
          source={{ uri: attachment.download_url }}
          style={styles.attachmentImage}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.fileCard, isUser ? styles.fileCardUser : styles.fileCardBot]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      <Text style={styles.fileIcon}>{getFileEmoji(attachment.file_type)}</Text>
      <View style={styles.fileInfo}>
        <Text
          style={[styles.fileName, isUser ? styles.fileNameUser : styles.fileNameBot]}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {attachment.file_name}
        </Text>
        {attachment.file_size > 0 && (
          <Text style={[styles.fileSize, isUser ? styles.fileSizeUser : styles.fileSizeBot]}>
            {formatFileSize(attachment.file_size)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.from === 'user';
  const isSystem = message.from === 'system';

  if (isSystem) {
    return (
      <View style={styles.systemWrapper}>
        <Text style={styles.systemText}>{message.text}</Text>
      </View>
    );
  }

  const hasText = !!(message.text && message.text.trim().length > 0);
  const hasAttachment = !!message.attachment;

  return (
    <View style={[styles.wrapper, isUser ? styles.wrapperRight : styles.wrapperLeft]}>
      {!isUser && (
        <Image source={YISA_AVATAR} style={styles.avatar} />
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
        {hasAttachment && (
          <AttachmentView attachment={message.attachment!} isUser={isUser} />
        )}
        {hasText && (
          <Text style={[styles.text, isUser ? styles.textUser : styles.textBot]}>
            {message.text}
          </Text>
        )}
        <Text style={[styles.time, isUser ? styles.timeUser : styles.timeBot]}>
          {formatTime(message.timestamp)}{isUser ? '  ✓' : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    marginVertical: 3,
    marginHorizontal: 12,
    alignItems: 'flex-end',
  },
  wrapperLeft: { justifyContent: 'flex-start' },
  wrapperRight: { justifyContent: 'flex-end' },

  avatar: {
    width: 32, height: 32, borderRadius: 16,
    marginRight: 6, marginBottom: 2,
    backgroundColor: '#cce8f8',
  },

  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 6,
  },
  bubbleUser: {
    backgroundColor: '#1565c0',
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    shadowColor: '#0f4c81',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  text: { fontSize: 15, lineHeight: 21 },
  textUser: { color: '#ffffff' },
  textBot: { color: '#1a1a1a' },

  time: { fontSize: 11, marginTop: 3, alignSelf: 'flex-end' },
  timeUser: { color: '#afdef8' },
  timeBot: { color: '#aaa' },

  systemWrapper: {
    alignItems: 'center',
    marginVertical: 8,
    marginHorizontal: 12,
  },
  systemText: {
    fontSize: 12, color: '#555',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 12, overflow: 'hidden',
  },

  // Attachment — Bild
  attachmentImage: {
    width: 200,
    height: 180,
    borderRadius: 10,
    marginBottom: 4,
  },

  // Attachment — Datei-Karte
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  fileCardUser: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  fileCardBot: {
    backgroundColor: '#f0f9ff',
  },
  fileIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
  },
  fileNameUser: { color: '#ffffff' },
  fileNameBot: { color: '#0f4c81' },
  fileSize: {
    fontSize: 11,
    marginTop: 2,
  },
  fileSizeUser: { color: '#afdef8' },
  fileSizeBot: { color: '#888' },
});
