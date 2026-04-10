import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
  ScrollView, Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { loginUser, registerUser } from '../services/api';
import { saveAuth } from '../store/authStore';
import { RootStackParamList } from '../types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

type Step = 'phone' | 'register';

const YISA_AVATAR = require('../../assets/yisa_avatar.png');

export default function OnboardingScreen({ navigation }: Props) {
  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  async function handlePhoneSubmit() {
    const cleaned = phone.trim();
    if (!cleaned) return;
    setLoading(true);
    try {
      const res = await loginUser(cleaned);
      const { token, session_id, user } = res.data;
      await saveAuth(token, session_id, user);
      navigation.replace('Chat');
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setStep('register');
      } else {
        const msg = err?.response?.data?.message ?? err?.message ?? 'Unbekannt';
        Alert.alert('Fehler', msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Pflichtfelder', 'Bitte Vorname und Nachname eingeben.');
      return;
    }
    setLoading(true);
    try {
      const res = await registerUser({
        phone: phone.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || undefined,
      });
      const { token, session_id, user } = res.data;
      await saveAuth(token, session_id, user);
      navigation.replace('Chat');
    } catch (err: any) {
      if (err?.response?.status === 409) {
        handlePhoneSubmit();
      } else if (err?.response?.data?.errors) {
        const msgs = Object.values(err.response.data.errors).flat().join('\n');
        Alert.alert('Fehler', msgs);
      } else {
        const msg = err?.response?.data?.message ?? err?.message ?? 'Unbekannt';
        Alert.alert('Fehler', msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Image source={YISA_AVATAR} style={styles.avatar} />
          <Text style={styles.appName}>YISA</Text>
          <Text style={styles.tagline}>Dein Reise-Assistent von YISU Travel</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {step === 'phone' ? (
            <>
              <Text style={styles.title}>Willkommen</Text>
              <Text style={styles.subtitle}>
                Gib deine Telefonnummer ein um zu starten.
              </Text>

              <Text style={styles.inputLabel}>Telefonnummer</Text>
              <TextInput
                style={styles.input}
                placeholder="+49 123 456789"
                placeholderTextColor="#aaa"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handlePhoneSubmit}
              />

              <TouchableOpacity
                style={[styles.btn, (!phone.trim() || loading) && styles.btnDisabled]}
                onPress={handlePhoneSubmit}
                disabled={!phone.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Weiter →</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Kurze Vorstellung</Text>
              <Text style={styles.subtitle}>
                Einmalig — danach nie wieder.
              </Text>

              <Text style={styles.inputLabel}>Vorname *</Text>
              <TextInput
                style={styles.input}
                placeholder="Max"
                placeholderTextColor="#aaa"
                value={firstName}
                onChangeText={setFirstName}
                autoFocus
                returnKeyType="next"
              />

              <Text style={styles.inputLabel}>Nachname *</Text>
              <TextInput
                style={styles.input}
                placeholder="Mustermann"
                placeholderTextColor="#aaa"
                value={lastName}
                onChangeText={setLastName}
                returnKeyType="next"
              />

              <Text style={styles.inputLabel}>E-Mail (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="max@beispiel.de"
                placeholderTextColor="#aaa"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Loslegen →</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep('phone')} style={styles.back}>
                <Text style={styles.backText}>← Zurück</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.legal}>
          Mit der Nutzung stimmst du unseren Nutzungsbedingungen zu.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f4c81' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  header: { alignItems: 'center', marginBottom: 28 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    marginBottom: 12,
    borderWidth: 3, borderColor: '#afdef8',
    backgroundColor: '#cce8f8',
  },
  appName: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  tagline: { fontSize: 13, color: '#afdef8', marginTop: 4 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#0f4c81', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20, lineHeight: 20 },

  inputLabel: { fontSize: 12, fontWeight: '600', color: '#0f4c81', marginBottom: 4, marginLeft: 2 },
  input: {
    borderWidth: 1.5, borderColor: '#e0f2fe', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: '#111', marginBottom: 14,
    backgroundColor: '#f0f9ff',
  },

  btn: {
    backgroundColor: '#0f4c81', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  back: { alignItems: 'center', marginTop: 16 },
  backText: { color: '#1565c0', fontSize: 14, fontWeight: '500' },

  legal: {
    textAlign: 'center',
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 20,
    paddingHorizontal: 12,
  },
});
