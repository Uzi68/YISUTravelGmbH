import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatScreen from './src/screens/ChatScreen';
import ChatInfoScreen from './src/screens/ChatInfoScreen';
import SettingsScreen from './src/screens/SettingsScreen';

import { RootStackParamList } from './src/types/navigation';
export type { RootStackParamList };

import { BRAND_DARK, BRAND_MID, BRAND_LIGHT, BG_APP } from './src/constants/colors';
export { BRAND_DARK, BRAND_MID, BRAND_LIGHT, BG_APP };

import { ChatHeaderTitle } from './src/components/ChatHeaderTitle';
export { ChatHeaderTitle };

const Stack = createNativeStackNavigator<RootStackParamList>();

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
          options={({ navigation, route }) => ({
            headerTitle: () => (
              <ChatHeaderTitle
                onPress={() => navigation.navigate('ChatInfo', { sessionId: route.params.sessionId })}
              />
            ),
          })}
        />
        <Stack.Screen
          name="ChatInfo"
          component={ChatInfoScreen}
          options={{
            title: 'Chat Info',
            headerStyle: { backgroundColor: BRAND_DARK },
            headerTintColor: '#fff',
          }}
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
  headerBtn: { padding: 6 },
  headerBtnText: { color: '#fff', fontSize: 20 },
});
