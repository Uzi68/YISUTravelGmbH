import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, KeyboardAvoidingView, Platform,
  TextInput, TouchableOpacity, Text, ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import MessageBubble, { Message, Attachment } from '../components/MessageBubble';
import TypingIndicator from '../components/TypingIndicator';
import { sendMessage, getChatHistory, markSessionAsRead, uploadAttachment } from '../services/api';
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
  const [chatId, setChatId] = useState<number | null>(null);
  const listRef = useRef<FlatList>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Chat-History laden + als gelesen markieren
  useEffect(() => {
    (async () => {
      // Als gelesen markieren (silent — kein Fehler anzeigen)
      markSessionAsRead(sessionId).catch(() => {});

      try {
        const res = await getChatHistory(sessionId);
        setChatId(res.data?.chat_id ?? null);
        const rawHistory: any[] = res.data?.messages ?? (Array.isArray(res.data) ? res.data : []);
        const history: Message[] = rawHistory.map((m: any) => ({
          id: uid(),
          from: (m?.from ?? m?.sender ?? 'bot') as Message['from'],
          text: toStr(m?.text ?? m?.message ?? ''),
          timestamp: m?.created_at ? new Date(m.created_at) : new Date(),
          attachment: m?.attachment ?? undefined,
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
        const msgData = data.message && typeof data.message === 'object' ? data.message : data;
        const from = toStr(msgData.from ?? msgData.sender ?? 'bot') as Message['from'];
        const text = toStr(msgData.text ?? '');
        // Fix: auch Attachment-only Nachrichten (kein Text) durchlassen
        if ((!text && !msgData.attachment) || from === 'user') return;

        setIsTyping(false);
        clearTimeout(typingTimeout);

        // Neue Nachricht sofort als gelesen markieren (User ist im Chat)
        markSessionAsRead(sessionId).catch(() => {});

        setMessages((prev) => {
          const filtered = prev.filter((m) => !m.isOptimistic || m.from === 'user');
          return [
            ...filtered,
            {
              id: uid(),
              from,
              text,
              timestamp: msgData.created_at ? new Date(msgData.created_at) : new Date(),
              attachment: msgData.attachment ?? undefined,
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

    try {
      const res = await sendMessage(text);

      const newSessionId = res.data?.session_id || res.data?.new_session_id;
      if (newSessionId && newSessionId !== sessionId) {
        await SecureStore.setItemAsync('session_id', newSessionId);
      }
      // Bot-Antwort kommt ausschließlich via Pusher — HTTP-Response ignorieren.

      // chat_id nachladen falls noch unbekannt (erster Nachricht im neuen Chat)
      if (!chatId) {
        getChatHistory(sessionId).then((r) => {
          if (r.data?.chat_id) setChatId(r.data.chat_id);
        }).catch(() => {});
      }
    } catch (err: any) {
      const status = err?.response?.status ?? 'kein Status';
      const msg = err?.response?.data?.message ?? err?.message ?? 'Unbekannt';
      Alert.alert('Fehler', `Status: ${status}\n${msg}`);
      setMessages((prev) =>
        prev.map((m) => m.id === optimisticId ? { ...m, text: m.text + ' ⚠️' } : m)
      );
    } finally {
      setSending(false);
      setIsTyping(false);
    }
  }, [input, sending, sessionId, chatId]);

  const sendAttachment = useCallback(async (uri: string, name: string, type: string, resolvedChatId: number) => {
    const optimisticId = uid();
    const optimisticAttachment: Attachment = {
      id: -1,
      file_name: name,
      file_type: type.startsWith('image/') ? 'image' : 'other',
      file_size: 0,
      download_url: uri,
    };

    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        from: 'user',
        text: '',
        timestamp: new Date(),
        isOptimistic: true,
        attachment: optimisticAttachment,
      },
    ]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

    const formData = new FormData();
    formData.append('file', { uri, name, type } as any);
    formData.append('chat_id', String(resolvedChatId));
    formData.append('session_id', sessionId);
    formData.append('from', 'user');

    try {
      const res = await uploadAttachment(formData);
      const confirmed: Attachment = res.data.attachment;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId ? { ...m, isOptimistic: false, attachment: confirmed } : m
        )
      );
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      const msg = err?.response?.data?.message ?? err?.message ?? 'Unbekannt';
      Alert.alert('Upload-Fehler', msg);
    }
  }, [sessionId]);

  const handleAttach = useCallback(async () => {
    let activeChatId = chatId;

    // chatId lazy nachladen falls noch unbekannt
    if (activeChatId === null) {
      try {
        const r = await getChatHistory(sessionId);
        activeChatId = r.data?.chat_id ?? null;
        if (activeChatId) setChatId(activeChatId);
      } catch { /* ignorieren */ }
    }

    if (activeChatId === null) {
      Alert.alert('Hinweis', 'Bitte sende zuerst eine Textnachricht, dann kannst du Anhänge hinzufügen.');
      return;
    }

    Alert.alert(
      'Anhang senden',
      '',
      [
        {
          text: 'Bild aus Galerie',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.85,
              allowsEditing: false,
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              await sendAttachment(
                asset.uri,
                asset.fileName ?? `image_${Date.now()}.jpg`,
                asset.mimeType ?? 'image/jpeg',
                activeChatId!,
              );
            }
          },
        },
        {
          text: 'Kamera',
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.85,
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              await sendAttachment(
                asset.uri,
                asset.fileName ?? `photo_${Date.now()}.jpg`,
                asset.mimeType ?? 'image/jpeg',
                activeChatId!,
              );
            }
          },
        },
        {
          text: 'Datei',
          onPress: async () => {
            const result = await DocumentPicker.getDocumentAsync({
              copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              await sendAttachment(
                asset.uri,
                asset.name,
                asset.mimeType ?? 'application/octet-stream',
                activeChatId!,
              );
            }
          },
        },
        { text: 'Abbrechen', style: 'cancel' },
      ]
    );
  }, [chatId, sendAttachment]);

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
          <TouchableOpacity style={styles.attachBtn} onPress={handleAttach}>
            <Text style={styles.attachIcon}>📎</Text>
          </TouchableOpacity>
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
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  attachIcon: {
    fontSize: 22,
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
