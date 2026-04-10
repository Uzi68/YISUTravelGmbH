import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Linking, ScrollView, Dimensions,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { BRAND_DARK, BRAND_LIGHT, BG_APP } from '../constants/colors';
import { getChatHistory } from '../services/api';
import { subscribeToChat } from '../services/pusherClient';
import { Attachment } from '../components/MessageBubble';

const YISA_AVATAR = require('../../assets/yisa_avatar.png');
const TILE_SIZE = (Dimensions.get('window').width - 4) / 3;

type Props = {
  route: RouteProp<RootStackParamList, 'ChatInfo'>;
};

function formatDate(date: Date): string {
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ', ' + date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
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

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function getStatusLabel(status: string): { text: string; color: string } {
  switch (status) {
    case 'bot':         return { text: '🤖 Bot',           color: '#1565c0' };
    case 'human':
    case 'in_progress': return { text: '👤 Agent',         color: '#2e7d32' };
    case 'closed':      return { text: '🔴 Beendet',       color: '#c62828' };
    default:            return { text: '🟢 Aktiv',         color: '#1565c0' };
  }
}

export default function ChatInfoScreen({ route }: Props) {
  const { sessionId } = route.params;
  const [loading, setLoading] = useState(true);
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [lastActiveAt, setLastActiveAt] = useState<Date | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [chatStatus, setChatStatus] = useState('');
  const [agentName, setAgentName] = useState<string | null>(null);
  const [agentAvatar, setAgentAvatar] = useState<string | null>(null);
  const [images, setImages] = useState<Attachment[]>([]);
  const [files, setFiles] = useState<Attachment[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getChatHistory(sessionId);
        const rawMessages: any[] = res.data?.messages ?? (Array.isArray(res.data) ? res.data : []);

        if (rawMessages.length > 0) {
          if (rawMessages[0].created_at) setCreatedAt(new Date(rawMessages[0].created_at));
          const last = rawMessages[rawMessages.length - 1];
          if (last.created_at) setLastActiveAt(new Date(last.created_at));
        }

        setMessageCount(rawMessages.filter((m: any) => m.from !== 'system').length);
        setChatStatus(res.data?.chat_status ?? '');

        // Agent aus History-Response
        if (res.data?.assigned_agent_name) {
          setAgentName(res.data.assigned_agent_name);
          setAgentAvatar(res.data.assigned_agent_avatar ?? null);
        } else {
          // Fallback: Agent-Name aus System-Nachricht parsen
          const takeover = rawMessages.find(
            (m: any) => m.from === 'system' && typeof m.text === 'string' && m.text.includes('übernommen')
          );
          if (takeover) {
            const match = (takeover.text as string).match(/^(.+?)\s+hat den Chat/);
            if (match) setAgentName(match[1]);
          }
        }

        const imgs: Attachment[] = [];
        const docs: Attachment[] = [];
        rawMessages.forEach((m: any) => {
          const att: Attachment | undefined = m.attachment;
          if (!att) return;
          if (att.file_type === 'image') imgs.push(att);
          else docs.push(att);
        });

        setImages(imgs);
        setFiles(docs);
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  // Echtzeit-Updates: Status + Agent wenn Mitarbeiter übernimmt
  useEffect(() => {
    const unsub = subscribeToChat(sessionId, (data) => {
      if (data.status) setChatStatus(data.status);
      if (data.assigned_agent) setAgentName(data.assigned_agent);
      if (data.agent_name)     setAgentName(data.agent_name);
      if (data.agent_avatar !== undefined) setAgentAvatar(data.agent_avatar ?? null);

      // System-Nachricht "X hat den Chat übernommen" → Agent-Name parsen
      const msg = data.message;
      if (msg?.from === 'system' && typeof msg.text === 'string' && msg.text.includes('übernommen')) {
        const match = (msg.text as string).match(/^(.+?)\s+hat den Chat/);
        if (match) setAgentName(match[1]);
      }
    });
    return unsub;
  }, [sessionId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={BRAND_DARK} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>

      {/* ── Info-Card ─────────────────────────────────────── */}
      <View style={styles.infoCard}>
        <Image
          source={agentAvatar ? { uri: agentAvatar } : YISA_AVATAR}
          style={styles.avatar}
        />
        <Text style={styles.name}>{agentName ?? 'YISA'}</Text>
        <Text style={styles.subtitle}>von YISU Travel</Text>

        <MetaRow label="Chat erstellt"    value={createdAt ? formatDate(createdAt) : '—'} />
        <Divider />
        <MetaRow label="Letzter Kontakt"  value={lastActiveAt ? formatDate(lastActiveAt) : '—'} />
        <Divider />
        <MetaRow label="Nachrichten"      value={String(messageCount)} />
        {chatStatus ? (
          <>
            <Divider />
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Status</Text>
              <Text style={[styles.metaValue, { color: getStatusLabel(chatStatus).color }]}>
                {getStatusLabel(chatStatus).text}
              </Text>
            </View>
          </>
        ) : null}
        {agentName ? (
          <>
            <Divider />
            <MetaRow label="Zuständiger Agent" value={agentName} />
          </>
        ) : null}
      </View>

      {/* ── Geteilte Medien ───────────────────────────────── */}
      <Text style={styles.sectionTitle}>Geteilte Medien</Text>

      {images.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Keine Medien</Text>
        </View>
      ) : (
        <View style={styles.imageGrid}>
          {images.map((img, i) => (
            <TouchableOpacity
              key={`${img.id}-${i}`}
              style={styles.imageTile}
              activeOpacity={0.8}
              onPress={() => Linking.openURL(img.download_url).catch(() => {})}
            >
              <Image source={{ uri: img.download_url }} style={styles.tileImg} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Geteilte Dateien ──────────────────────────────── */}
      <Text style={styles.sectionTitle}>Geteilte Dateien</Text>

      {files.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Keine Dateien</Text>
        </View>
      ) : (
        <View style={styles.fileList}>
          {files.map((file, i) => (
            <TouchableOpacity
              key={`${file.id}-${i}`}
              style={styles.fileRow}
              activeOpacity={0.75}
              onPress={() => Linking.openURL(file.download_url).catch(() => {})}
            >
              <Text style={styles.fileEmoji}>{getFileEmoji(file.file_type)}</Text>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                  {file.file_name}
                </Text>
                {file.file_size > 0 && (
                  <Text style={styles.fileSize}>{formatFileSize(file.file_size)}</Text>
                )}
              </View>
              <Text style={styles.fileArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_APP },
  content: { paddingBottom: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG_APP },

  // Info Card
  infoCard: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 20,
    paddingHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#0f4c81',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#cce8f8', marginBottom: 12,
  },
  name: { fontSize: 22, fontWeight: '700', color: BRAND_DARK },
  subtitle: { fontSize: 13, color: '#888', marginBottom: 20 },

  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 8,
  },
  metaLabel: { fontSize: 14, color: '#555' },
  metaValue: { fontSize: 14, fontWeight: '600', color: BRAND_DARK },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#e0f2fe', width: '100%' },

  // Section titles
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },

  // Image grid
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    paddingHorizontal: 2,
  },
  imageTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  tileImg: {
    width: '100%',
    height: '100%',
  },

  // Empty state
  emptyBox: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
  },
  emptyText: { color: '#aaa', fontSize: 14 },

  // File list
  fileList: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#0f4c81',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0f2fe',
  },
  fileEmoji: { fontSize: 26, marginRight: 14 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '600', color: BRAND_DARK },
  fileSize: { fontSize: 12, color: '#888', marginTop: 2 },
  fileArrow: { fontSize: 20, color: BRAND_LIGHT, marginLeft: 8 },
});
