import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { api } from './api';
import { colors, cardShadowLg } from './tokens';

export default function Login({ onLoggedIn }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    if (!phone || !password) { setError('Enter phone and password'); return; }
    setLoading(true);
    try {
      const { token, user } = await api.auth.login(phone, password);
      await onLoggedIn(token, user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.brandNavy }}>Lending Collection</Text>
        <Text style={{ fontSize: 13, color: 'rgba(0,0,0,.55)', marginTop: 4 }}>Sign in to continue</Text>
      </View>
      <View style={{ width: '100%', maxWidth: 320, gap: 12 }}>
        <TextInput value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" autoCapitalize="none" style={inputStyle} />
        <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry style={inputStyle} />
        {error ? <Text style={{ color: colors.error800, fontSize: 13 }}>{error}</Text> : null}
        <TouchableOpacity onPress={submit} disabled={loading} style={{ alignItems: 'center', backgroundColor: colors.brandNavy, borderRadius: 12, padding: 16, opacity: loading ? 0.7 : 1, ...cardShadowLg }}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Sign in</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const inputStyle = { fontSize: 15, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 14, backgroundColor: '#fff' };
