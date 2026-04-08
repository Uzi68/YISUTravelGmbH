import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export interface Message {
  id: string;
  from: 'user' | 'bot' | 'agent' | 'system';
  text: string;
  timestamp?: Date;
  isOptimistic?: boolean;
}

interface Props {
  message: Message;
}

const YISA_AVATAR = require('../../assets/yisa_avatar.png');

function formatTime(date?: Date): string {
  if (!date) return '';
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
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

  return (
    <View style={[styles.wrapper, isUser ? styles.wrapperRight : styles.wrapperLeft]}>
      {!isUser && (
        <Image source={YISA_AVATAR} style={styles.avatar} />
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
        <Text style={[styles.text, isUser ? styles.textUser : styles.textBot]}>
          {message.text}
        </Text>
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
});
