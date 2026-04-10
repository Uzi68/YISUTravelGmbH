import React, { useEffect } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { loadAuth, saveAuth } from '../store/authStore';
import { getMe } from '../services/api';
import { initNotifications } from '../services/notifications';
import { RootStackParamList } from '../types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Splash'>;
};

const YISA_AVATAR = require('../../assets/yisa_avatar.png');

export default function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    (async () => {
      const auth = await loadAuth();

      if (!auth.token) {
        navigation.replace('Onboarding');
        return;
      }

      try {
        const res = await getMe();
        const { user, session_id } = res.data;
        await saveAuth(auth.token, session_id ?? auth.sessionId ?? '', user);
        initNotifications(); // Fire-and-forget — blockiert nicht den App-Start
        navigation.replace('ChatList');
      } catch {
        navigation.replace('Onboarding');
      }
    })();
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.logoCard}>
        <Image source={YISA_AVATAR} style={styles.avatar} />
        <Text style={styles.appName}>YISA</Text>
        <Text style={styles.tagline}>Dein persönlicher Reise-Assistent</Text>
        <Text style={styles.brand}>von YISU Travel GmbH</Text>
      </View>
      <ActivityIndicator style={styles.spinner} color="#afdef8" size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f4c81',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCard: {
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#afdef8',
    backgroundColor: '#cce8f8',
  },
  appName: {
    fontSize: 38,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 15,
    color: '#afdef8',
    marginTop: 6,
    fontWeight: '400',
  },
  brand: {
    fontSize: 12,
    color: 'rgba(175, 222, 248, 0.6)',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  spinner: {
    marginTop: 60,
  },
});
