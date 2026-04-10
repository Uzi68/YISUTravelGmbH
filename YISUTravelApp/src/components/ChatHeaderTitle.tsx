import React from 'react';
import { TouchableOpacity, Image, View, Text, StyleSheet } from 'react-native';
import { BRAND_LIGHT } from '../constants/colors';

const YISA_AVATAR = require('../../assets/yisa_avatar.png');

export function ChatHeaderTitle({
  onPress,
  agentName,
  agentAvatar,
}: {
  onPress?: () => void;
  agentName?: string | null;
  agentAvatar?: string | null;
}) {
  const name = agentName || 'YISA';
  const avatarSource = agentAvatar ? { uri: agentAvatar } : YISA_AVATAR;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.7 : 1} style={styles.headerTitle}>
      <Image source={avatarSource} style={styles.headerAvatar} />
      <View>
        <Text style={styles.headerName}>{name}</Text>
        <Text style={styles.headerStatus}>von YISU Travel</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  headerTitle: { flexDirection: 'row', alignItems: 'center' },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    marginRight: 10, backgroundColor: '#cce8f8',
  },
  headerName: { color: '#fff', fontWeight: '700', fontSize: 16 },
  headerStatus: { color: BRAND_LIGHT, fontSize: 11, marginTop: 1 },
});
