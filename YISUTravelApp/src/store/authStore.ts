import * as SecureStore from 'expo-secure-store';

export interface AuthUser {
  id: number;
  first_name: string;
  last_name: string;
  name: string;
  email: string | null;
  phone: string;
}

export interface AuthState {
  token: string | null;
  sessionId: string | null;
  user: AuthUser | null;
}

const KEYS = {
  token: 'mobile_token',
  sessionId: 'session_id',
  user: 'mobile_user',
} as const;

export async function saveAuth(token: string, sessionId: string, user: AuthUser) {
  await SecureStore.setItemAsync(KEYS.token, token);
  await SecureStore.setItemAsync(KEYS.sessionId, sessionId);
  await SecureStore.setItemAsync(KEYS.user, JSON.stringify(user));
}

export async function loadAuth(): Promise<AuthState> {
  const [token, sessionId, userJson] = await Promise.all([
    SecureStore.getItemAsync(KEYS.token),
    SecureStore.getItemAsync(KEYS.sessionId),
    SecureStore.getItemAsync(KEYS.user),
  ]);

  return {
    token,
    sessionId,
    user: userJson ? JSON.parse(userJson) : null,
  };
}

export async function clearAuth() {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.token),
    SecureStore.deleteItemAsync(KEYS.sessionId),
    SecureStore.deleteItemAsync(KEYS.user),
  ]);
}

export async function updateStoredUser(user: AuthUser) {
  await SecureStore.setItemAsync(KEYS.user, JSON.stringify(user));
}
