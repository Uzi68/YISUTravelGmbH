import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getMe, updateMe } from '../services/api';
import { clearAuth, updateStoredUser, AuthUser } from '../store/authStore';
import { RootStackParamList } from '../types/navigation';
import { disconnectPusher } from '../services/pusherClient';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

export default function SettingsScreen({ navigation }: Props) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await getMe();
        const u = res.data.user as AuthUser;
        setUser(u);
        setFirstName(u.first_name || '');
        setLastName(u.last_name || '');
        setEmail(u.email || '');
      } catch {
        Alert.alert('Fehler', 'Profil konnte nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await updateMe({
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        email: email.trim() || undefined,
      });
      const updated = res.data.user as AuthUser;
      setUser(updated);
      await updateStoredUser(updated);
      setEditing(false);
      Alert.alert('Gespeichert', 'Deine Daten wurden aktualisiert.');
    } catch {
      Alert.alert('Fehler', 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Abmelden', 'Wirklich abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Abmelden', style: 'destructive',
        onPress: async () => {
          disconnectPusher();
          await clearAuth();
          navigation.replace('Onboarding');
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f4c81" />
      </View>
    );
  }

  const initials = (user?.first_name?.[0] ?? '?').toUpperCase();

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar-Bereich */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.name || '—'}</Text>
          <Text style={styles.phone}>{user?.phone || ''}</Text>
        </View>

        {/* Profil-Karte */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Persönliche Daten</Text>

          <Field label="Vorname">
            {editing ? (
              <TextInput style={styles.inputEdit} value={firstName}
                onChangeText={setFirstName} placeholder="Vorname" placeholderTextColor="#aaa" />
            ) : (
              <Text style={styles.fieldValue}>{user?.first_name || '—'}</Text>
            )}
          </Field>

          <Field label="Nachname">
            {editing ? (
              <TextInput style={styles.inputEdit} value={lastName}
                onChangeText={setLastName} placeholder="Nachname" placeholderTextColor="#aaa" />
            ) : (
              <Text style={styles.fieldValue}>{user?.last_name || '—'}</Text>
            )}
          </Field>

          <Field label="E-Mail">
            {editing ? (
              <TextInput style={styles.inputEdit} value={email}
                onChangeText={setEmail} placeholder="E-Mail" placeholderTextColor="#aaa"
                keyboardType="email-address" autoCapitalize="none" />
            ) : (
              <Text style={styles.fieldValue}>{user?.email || '—'}</Text>
            )}
          </Field>

          <Field label="Telefon" last>
            <Text style={styles.fieldValue}>{user?.phone || '—'}</Text>
          </Field>
        </View>

        {/* Buttons */}
        {editing ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => setEditing(false)}>
              <Text style={styles.btnSecondaryText}>Abbrechen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, saving && styles.btnDisabled]}
              onPress={handleSave} disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Speichern</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.btn} onPress={() => setEditing(true)}>
            <Text style={styles.btnText}>Profil bearbeiten</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Abmelden</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>YISU Travel GmbH • YISA v1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <View style={[fieldStyles.row, last && fieldStyles.rowLast]}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={fieldStyles.value}>{children}</View>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e0f2fe',
  },
  rowLast: { borderBottomWidth: 0 },
  label: { width: 90, fontSize: 12, color: '#0f4c81', fontWeight: '600' },
  value: { flex: 1 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f9ff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f9ff' },
  scroll: { padding: 20, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#0f4c81',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3, borderColor: '#afdef8',
  },
  avatarInitial: { color: '#fff', fontSize: 34, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: '#0f4c81' },
  phone: { fontSize: 14, color: '#555', marginTop: 3 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16, paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#0f4c81',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#0f4c81',
    letterSpacing: 1, textTransform: 'uppercase',
    paddingTop: 14, paddingBottom: 4,
  },

  fieldValue: { fontSize: 15, color: '#1a1a1a' },
  inputEdit: {
    fontSize: 15, color: '#111',
    borderWidth: 1.5, borderColor: '#afdef8', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#f0f9ff',
  },

  buttonRow: { flexDirection: 'row', marginBottom: 12 },
  btn: {
    flex: 1, backgroundColor: '#0f4c81',
    borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginBottom: 12,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnSecondary: {
    flex: 1, backgroundColor: '#e0f2fe',
    borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginRight: 10,
  },
  btnSecondaryText: { color: '#0f4c81', fontWeight: '600', fontSize: 15 },

  logoutBtn: {
    borderRadius: 12, paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5, borderColor: '#fecaca',
    backgroundColor: '#fff',
  },
  logoutText: { color: '#dc2626', fontWeight: '600', fontSize: 15 },

  footer: {
    textAlign: 'center', fontSize: 11,
    color: '#aaa', marginTop: 24,
  },
});
