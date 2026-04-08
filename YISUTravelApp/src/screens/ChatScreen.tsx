import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, KeyboardAvoidingView, Platform,
  TextInput, TouchableOpacity, Text, ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import MessageBubble, { Message } from '../components/MessageBubble';
import TypingIndicator from '../components/TypingIndicator';
import { sendMessage, getChatHistory } from '../services/api';
import { subscribeToChat } from '../services/pusherClient';
import { RootStackParamList } from '../../App';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
};

let msgCounter = 0;
function uid() { return `msg_${++msgCounter}_${Date.now()}`; }

const toStr = (v: any): string => {
  if (typeof v === 'string') return v;
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

export default function ChatScreen({ navigation: _navigation, route }: Props) {
  const sessionId = route.params.sessionId;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Chat-History laden
  useEffect(() => {
    (async () => {
      try {
        const res = await getChatHistory(sessionId);
        const rawHistory: any[] = res.data?.messages ?? (Array.isArray(res.data) ? res.data : []);
        const history: Message[] = rawHistory.map((m: any) => ({
          id: uid(),
          from: (m?.from ?? m?.sender ?? 'bot') as Message['from'],
          text: toStr(m?.text ?? m?.message ?? ''),
          timestamp: m?.created_at ? new Date(m.created_at) : new Date(),
        }));
        setMessages(history);
      } catch (err: any) {
        const status = err?.response?.status ?? 'kein Status';
        const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message ?? 'Unbekannt';
        Alert.alert('History-Fehler (Debug)', `Status: ${status}\n${msg}\n\nSession: ${sessionId?.slice(0, 8)}...`);
      }

      setLoading(false);
    })();
  }, [sessionId]);

  // Pusher-Listener einrichten
  useEffect(() => {
    if (!sessionId) return;

    let typingTimeout: ReturnType<typeof setTimeout>;

    const unsubscribe = subscribeToChat(
      sessionId,
      (data) => {
        // Pusher sendet: { event, message: { id, text, from, created_at, ... } }
        const msgData = data.message && typeof data.message === 'object' ? data.message : data;
        const from = toStr(msgData.from ?? msgData.sender ?? 'bot') as Message['from'];
        const text = toStr(msgData.text ?? '');
        if (!text || from === 'user') return;

        setIsTyping(false);
        clearTimeout(typingTimeout);

        setMessages((prev) => {
          const filtered = prev.filter((m) => !m.isOptimistic || m.from === 'user');
          return [
            ...filtered,
            {
              id: uid(),
              from,
              text,
              timestamp: msgData.created_at ? new Date(msgData.created_at) : new Date(),
            },
          ];
        });

        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      },
      () => {
        setIsTyping(true);
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => setIsTyping(false), 5000);
      }
    );

    unsubscribeRef.current = unsubscribe;
    return () => {
      clearTimeout(typingTimeout);
      unsubscribe();
    };
  }, [sessionId]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);

    const optimisticId = uid();
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, from: 'user', text, timestamp: new Date() },
    ]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    setIsTyping(true);

    try {
      const res = await sendMessage(text);

      const newSessionId = res.data?.session_id || res.data?.new_session_id;
      if (newSessionId && newSessionId !== sessionId) {
        await SecureStore.setItemAsync('session_id', newSessionId);
      }
      // Bot-Antwort kommt ausschließlich via Pusher — HTTP-Response ignorieren.
      // Das verhindert doppelte Nachrichten, da Pusher schneller als HTTP ist.
    } catch (err: any) {
      setIsTyping(false);
      const status = err?.response?.status ?? 'kein Status';
      const msg = err?.response?.data?.message ?? err?.message ?? 'Unbekannt';
      Alert.alert('Fehler', `Status: ${status}\n${msg}`);
      setMessages((prev) =>
        prev.map((m) => m.id === optimisticId ? { ...m, text: m.text + ' ⚠️' } : m)
      );
    } finally {
      setSending(false);
    }
  }, [input, sending, sessionId]);

  if (loading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color="#1565c0" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble message={{ ...item, text: toStr(item.text) }} />
          )}
          contentContainerStyle={styles.list}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <View style={styles.emptyWrapper}>
              <Text style={styles.emptyTitle}>Hallo! Ich bin YISA</Text>
              <Text style={styles.emptyText}>
                Dein persönlicher Reise-Assistent von YISU Travel. Ich helfe dir bei
                Flugbuchungen, Reiseplanung und allen deinen Reisefragen.
              </Text>
              <Text style={styles.emptyHint}>Wie kann ich dir heute helfen?</Text>
            </View>
          }
          ListFooterComponent={isTyping ? <TypingIndicator /> : null}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Nachricht an YISA..."
            placeholderTextColor="#8ab4c8"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f9ff' },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f9ff' },
  list: { paddingVertical: 16, paddingBottom: 8 },

  emptyWrapper: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 36,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f4c81',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  emptyHint: {
    fontSize: 13,
    color: '#1565c0',
    fontWeight: '500',
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 10,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0f2fe',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#afdef8',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: '#111',
    maxHeight: 120,
    marginRight: 8,
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#0f4c81',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#b0c8e8' },
  sendIcon: { color: '#fff', fontSize: 18, marginLeft: 2 },
});
