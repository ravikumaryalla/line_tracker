import { View, Text } from 'react-native';
import { colors } from '../tokens';

export default function Header({ title, subtitle, right }) {
  return (
    <View style={{ backgroundColor: colors.brandNavy, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 15.5, fontWeight: '600', color: '#fff', lineHeight: 20 }}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}
