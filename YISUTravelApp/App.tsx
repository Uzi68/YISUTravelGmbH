import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, Image, View, Text, StyleSheet } from 'react-native';

import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatScreen from './src/screens/ChatScreen';
import SettingsScreen from './src/screens/SettingsScreen';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  ChatList: undefined;
  Chat: { sessionId: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const BRAND_DARK  = '#0f4c81';
export const BRAND_MID   = '#1565c0';
export const BRAND_LIGHT = '#afdef8';
export const BG_APP      = '#f0f9ff';

const YISA_AVATAR = require('./assets/yisa_avatar.png');

export function ChatHeaderTitle() {
  return (
    <View style={styles.headerTitle}>
      <Image source={YISA_AVATAR} style={styles.headerAvatar} />
      <View>
        <Text style={styles.headerName}>YISA</Text>
        <Text style={styles.headerStatus}>von YISU Travel</Text>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerStyle: { backgroundColor: BRAND_DARK },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ChatList"
          component={ChatListScreen}
          options={({ navigation }) => ({
            headerTitle: 'YISA',
            headerRight: () => (
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings')}
                style={styles.headerBtn}
              >
                <Text style={styles.headerBtnText}>⚙</Text>
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={({ navigation }) => ({
            headerTitle: () => <ChatHeaderTitle />,
            headerRight: () => (
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings')}
                style={styles.headerBtn}
              >
                <Text style={styles.headerBtnText}>⚙</Text>
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Mein Profil' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
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
  headerBtn: { padding: 6 },
  headerBtnText: { color: '#fff', fontSize: 20 },
});
