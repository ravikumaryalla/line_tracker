import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../tokens';

export default function BottomNav({ tabs, active, onChange }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.neutral300, paddingHorizontal: 4, paddingTop: 6, paddingBottom: 8 }}>
      {tabs.map(([label, key, icon = 'ellipse']) => {
        const isActive = active === key;
        const tint = isActive ? colors.brandNavy : 'rgba(0,0,0,.42)';
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onChange(key)}
            style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 6, borderRadius: 8 }}
          >
            <Ionicons name={isActive ? icon : `${icon}-outline`} size={22} color={tint} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: tint }}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
