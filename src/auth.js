import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'lc_token';
const USER_KEY = 'lc_user';

// expo-secure-store has no native backing on web; fall back to localStorage there
// so `expo start --web` keeps working (SecureStore stays used on Android/iOS).
const store = Platform.OS === 'web'
  ? {
      getItemAsync: async (k) => localStorage.getItem(k),
      setItemAsync: async (k, v) => localStorage.setItem(k, v),
      deleteItemAsync: async (k) => localStorage.removeItem(k),
    }
  : SecureStore;

export function getToken() {
  return store.getItemAsync(TOKEN_KEY);
}

export async function getStoredUser() {
  const raw = await store.getItemAsync(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function setSession(token, user) {
  await store.setItemAsync(TOKEN_KEY, token);
  await store.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearSession() {
  await store.deleteItemAsync(TOKEN_KEY);
  await store.deleteItemAsync(USER_KEY);
}

let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) { unauthorizedHandler = fn; }
export function notifyUnauthorized() { if (unauthorizedHandler) unauthorizedHandler(); }
