import { useState } from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AgentApp from './agent/AgentApp';
import AdminApp from './admin/AdminApp';
import { colors, cardShadowLg } from './tokens';

export default function App() {
  const [role, setRole] = useState(null);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }} edges={['top', 'bottom']}>
        {role === 'agent' && <AgentApp onSwitchRole={() => setRole(null)} />}
        {role === 'admin' && <AdminApp onSwitchRole={() => setRole(null)} />}
        {!role && <RolePicker onPick={setRole} />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function RolePicker({ onPick }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32 }}>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.brandNavy }}>Lending Collection</Text>
        <Text style={{ fontSize: 13, color: 'rgba(0,0,0,.55)', marginTop: 4 }}>Choose how you want to sign in</Text>
      </View>
      <View style={{ width: '100%', maxWidth: 320, gap: 12 }}>
        <RoleButton bg={colors.brandPrimary600} title="Agent app" sub="Collect payments in the field" onPress={() => onPick('agent')} />
        <RoleButton bg={colors.brandNavy} title="Admin app" sub="Manage villages, agents and money" onPress={() => onPick('admin')} />
      </View>
    </View>
  );
}

function RoleButton({ bg, title, sub, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ backgroundColor: bg, borderRadius: 12, padding: 18, ...cardShadowLg }}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff' }}>{title}</Text>
      <Text style={{ fontSize: 12.5, color: 'rgba(255,255,255,.8)', marginTop: 3 }}>{sub}</Text>
    </TouchableOpacity>
  );
}
