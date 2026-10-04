import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { api } from './api';
import { colors, cardShadowLg } from './tokens';

export default function Login({ onLoggedIn }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        <TextInput value={phone} onChangeText={setPhone} placeholder="Phone" placeholderTextColor={colors.fg4} keyboardType="phone-pad" autoCapitalize="none" style={inputStyle} />
        <View style={{ position: 'relative' }}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={colors.fg4}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            style={[inputStyle, { paddingRight: 64 }]}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(v => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' }}
          >
            <Text style={{ color: colors.brandPrimary700, fontSize: 13, fontWeight: '600' }}>{showPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>
        {error ? <Text style={{ color: colors.error800, fontSize: 13 }}>{error}</Text> : null}
        <TouchableOpacity onPress={submit} disabled={loading} style={{ alignItems: 'center', backgroundColor: colors.brandNavy, borderRadius: 12, padding: 16, opacity: loading ? 0.7 : 1, ...cardShadowLg }}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Sign in</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const inputStyle = { fontSize: 15, color: colors.fg1, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 14, backgroundColor: '#fff' };
