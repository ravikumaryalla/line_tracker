import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AgentApp from './agent/AgentApp';
import AdminApp from './admin/AdminApp';
import Login from './Login';
import { colors } from './tokens';
import { getStoredUser, setSession, clearSession, setUnauthorizedHandler } from './auth';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    getStoredUser().then(setUser).finally(() => setLoading(false));
  }, []);

  const onLoggedIn = async (token, loggedInUser) => {
    await setSession(token, loggedInUser);
    setUser(loggedInUser);
  };

  const onLogout = async () => {
    await clearSession();
    setUser(null);
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }} edges={['top', 'bottom']}>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.brandNavy} />
          </View>
        ) : !user ? (
          <Login onLoggedIn={onLoggedIn} />
        ) : user.role === 'admin' ? (
          <AdminApp user={user} onLogout={onLogout} />
        ) : (
          <AgentApp user={user} onLogout={onLogout} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
