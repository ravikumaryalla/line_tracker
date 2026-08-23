import { View, Text, TouchableOpacity } from 'react-native';
import { colors } from '../tokens';

export default function BottomNav({ tabs, active, onChange }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.neutral300, paddingHorizontal: 4, paddingTop: 6, paddingBottom: 8 }}>
      {tabs.map(([label, key]) => {
        const isActive = active === key;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onChange(key)}
            style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 6, borderRadius: 8 }}
          >
            <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: isActive ? colors.brandNavy : 'rgba(0,0,0,.42)', opacity: isActive ? 1 : 0.35 }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: isActive ? colors.brandNavy : 'rgba(0,0,0,.42)' }}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
