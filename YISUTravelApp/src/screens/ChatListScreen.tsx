import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { getSessions, createSession, getChatHistory, deleteSession } from '../services/api';
import { RootStackParamList } from '../../App';

// Farben direkt definieren — kein Import aus App.tsx (vermeidet Circular Import)
const BRAND_DARK = '#0f4c81';
const BRAND_MID  = '#1565c0';
const BG_APP     = '#f0f9ff';

const YISA_AVATAR = require('../../assets/yisa_avatar.png');

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ChatList'>;
};

interface ChatSession {
  session_id: string;
  last_message: string | null;
  last_message_from: string | null;
  last_message_at: string | null;
  created_at: string;
  message_count: number;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  const now = new Date();

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) {
    return 'Gestern';
  }

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}

function SessionItem({
  session,
  onPress,
  onLongPress,
}: {
  session: ChatSession;
  onPress: (session: ChatSession) => void;
  onLongPress: (session: ChatSession) => void;
}) {
  const timeLabel = formatTime(session.last_message_at ?? session.created_at);
  const preview = session.last_message ?? 'Noch keine Nachrichten';

  return (
    <TouchableOpacity
      style={styles.sessionRow}
      onPress={() => onPress(session)}
      onLongPress={() => onLongPress(session)}
      delayLongPress={400}
      activeOpacity={0.7}
    >
      <View style={styles.avatarOuter}>
        <Image source={YISA_AVATAR} style={styles.sessionAvatar} />
      </View>
      <View style={styles.sessionMiddle}>
        <Text style={styles.sessionName}>YISA</Text>
        <Text style={styles.sessionPreview} numberOfLines={1} ellipsizeMode="tail">
          {preview}
        </Text>
      </View>
      <View style={styles.sessionRight}>
        <Text style={styles.sessionTime}>{timeLabel}</Text>
        {session.message_count > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {session.message_count > 99 ? '99+' : session.message_count}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

export default function ChatListScreen({ navigation }: Props) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  // Lokal gelöschte Sessions merken — filtert Backend-Ergebnisse auch nach useFocusEffect
  const deletedIds = useRef<Set<string>>(new Set());

  const loadSessions = useCallback(async () => {
    // Versuch 1: Backend-Endpoint
    try {
      const res = await getSessions();
      const raw: any[] = res.data?.sessions ?? [];
      if (raw.length > 0) {
        const mapped: ChatSession[] = raw
          .filter((s: any) => !deletedIds.current.has(s.session_id))
          .map((s: any) => ({
            session_id:        s.session_id,
            last_message:      s.last_message ?? null,
            last_message_from: s.last_message_from ?? null,
            last_message_at:   s.last_message_at ?? null,
            created_at:        s.created_at,
            message_count:     s.message_count ?? 0,
          }));
        setSessions(mapped);
        return;
      }
    } catch { /* weiter zum Fallback */ }

    // Fallback: aktuelle Session aus SecureStore + History direkt laden
    const sid = await SecureStore.getItemAsync('session_id');
    if (!sid || deletedIds.current.has(sid)) { setSessions([]); return; }

    try {
      const histRes = await getChatHistory(sid);
      const msgs: any[] = histRes.data?.messages ?? [];
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
      setSessions([{
        session_id:        sid,
        last_message:      lastMsg?.text ?? null,
        last_message_from: lastMsg?.from ?? null,
        last_message_at:   lastMsg?.created_at ?? null,
        created_at:        new Date().toISOString(),
        message_count:     msgs.length,
      }]);
    } catch {
      // Zumindest die Session anzeigen, auch ohne History
      setSessions([{
        session_id:        sid,
        last_message:      null,
        last_message_from: null,
        last_message_at:   null,
        created_at:        new Date().toISOString(),
        message_count:     0,
      }]);
    }
  }, []);

  // Initialer Ladevorgang
  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadSessions();
      setLoading(false);
    })();
  }, []);

  // Sessions neu laden wenn Screen fokussiert wird (z.B. nach Zurück-Navigation)
  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  }, [loadSessions]);

  const handleOpenChat = useCallback(
    async (session: ChatSession) => {
      await SecureStore.setItemAsync('session_id', session.session_id);
      navigation.navigate('Chat', { sessionId: session.session_id });
    },
    [navigation],
  );

  const handleDeleteChat = useCallback((session: ChatSession) => {
    Alert.alert(
      'Chat löschen',
      'Möchtest du diesen Chat wirklich löschen? Alle Nachrichten werden dauerhaft entfernt.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            // Sofort lokal merken — verhindert Wiedererscheinen bei useFocusEffect-Reload
            deletedIds.current.add(session.session_id);
            setSessions((prev) => prev.filter((s) => s.session_id !== session.session_id));
            try {
              await deleteSession(session.session_id);
            } catch {
              // Backend-Fehler: lokal bereits entfernt, deletedIds hält es raus
            }

            // Falls gelöschte Session die aktive war, SecureStore leeren
            const currentId = await SecureStore.getItemAsync('session_id');
            if (currentId === session.session_id) {
              await SecureStore.deleteItemAsync('session_id');
            }
          },
        },
      ],
    );
  }, []);

  const handleNewChat = useCallback(async () => {
    if (creating) return;
    setCreating(true);

    let targetSessionId: string | null = null;

    try {
      const res = await createSession();
      targetSessionId = res.data?.session_id ?? null;
    } catch {
      // Fallback: bestehende Session aus SecureStore
      targetSessionId = await SecureStore.getItemAsync('session_id');
    }

    setCreating(false);

    if (!targetSessionId) {
      Alert.alert('Fehler', 'Konnte keine Chat-Session erstellen.');
      return;
    }

    await SecureStore.setItemAsync('session_id', targetSessionId);

    // Optimistisch zur Liste hinzufügen falls noch nicht vorhanden
    setSessions((prev) => {
      if (prev.find((s) => s.session_id === targetSessionId)) return prev;
      return [{
        session_id:        targetSessionId!,
        last_message:      null,
        last_message_from: null,
        last_message_at:   null,
        created_at:        new Date().toISOString(),
        message_count:     0,
      }, ...prev];
    });

    navigation.navigate('Chat', { sessionId: targetSessionId });
  }, [creating, navigation]);

  if (loading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color={BRAND_MID} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.session_id}
        renderItem={({ item }) => (
          <SessionItem session={item} onPress={handleOpenChat} onLongPress={handleDeleteChat} />
        )}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={sessions.length === 0 ? styles.emptyContainer : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={BRAND_MID}
            colors={[BRAND_MID]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrapper}>
            <Image source={YISA_AVATAR} style={styles.emptyAvatar} />
            <Text style={styles.emptyTitle}>Noch kein Chat</Text>
            <Text style={styles.emptyText}>
              Tippe auf das + Symbol um deinen ersten Chat mit YISA zu starten.
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={handleNewChat}
        activeOpacity={0.8}
        disabled={creating}
      >
        {creating ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.fabIcon}>+</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_APP,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG_APP,
  },

  // Session row
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  avatarOuter: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  sessionAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#cce8f8',
  },
  sessionMiddle: {
    flex: 1,
    justifyContent: 'center',
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 3,
  },
  sessionPreview: {
    fontSize: 14,
    color: '#666',
  },
  sessionRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
    minWidth: 44,
  },
  sessionTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  badge: {
    backgroundColor: BRAND_MID,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Separator
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e0f2fe',
    marginLeft: 78,
  },

  // Empty state
  emptyContainer: {
    flexGrow: 1,
  },
  emptyWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#cce8f8',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: BRAND_DARK,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND_DARK,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  fabIcon: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 32,
    marginTop: -2,
  },
});
