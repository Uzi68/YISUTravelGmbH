import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://backend.yisu-travel.de/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
});

// Bearer-Token bei jedem Request automatisch mitsenden
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('mobile_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const sessionId = await SecureStore.getItemAsync('session_id');
  if (sessionId) {
    config.headers['X-Session-ID'] = sessionId;
  }
  return config;
});

// ─── Auth ──────────────────────────────────────────────────────────────────

export const registerUser = (data: {
  phone: string;
  first_name: string;
  last_name: string;
  email?: string;
}) => api.post('/mobile/register', data);

export const loginUser = (phone: string) =>
  api.post('/mobile/login', { phone });

export const getMe = () => api.get('/mobile/me');

export const updateMe = (data: {
  first_name?: string;
  last_name?: string;
  email?: string;
}) => api.patch('/mobile/me', data);

// ─── Sessions ──────────────────────────────────────────────────────────────

export const getSessions = () =>
  api.get('/mobile/sessions');

export const createSession = () =>
  api.post('/mobile/sessions');

export const deleteSession = (sessionId: string) =>
  api.delete(`/mobile/sessions/${sessionId}`);

export const registerPushToken = (data: {
  token: string;
  device_id?: string;
  device_name?: string;
  platform?: string;
}) => api.post('/mobile/push-token', data);

// ─── Chat ──────────────────────────────────────────────────────────────────

export const sendMessage = (message: string) =>
  api.post('/chatbot/input/anonymous', { message });

export const getChatHistory = (sessionId?: string) =>
  api.get('/mobile/chat-history' + (sessionId ? `?session_id=${sessionId}` : ''));

export default api;
