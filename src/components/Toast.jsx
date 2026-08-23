import { View, Text } from 'react-native';
import { colors } from '../tokens';

export default function Toast({ message }) {
  if (!message) return null;
  return (
    <View
      style={{
        position: 'absolute', left: 14, right: 14, bottom: 78,
        backgroundColor: colors.brandNavy, borderRadius: 10,
        paddingVertical: 13, paddingHorizontal: 16, zIndex: 30,
        elevation: 10,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>{message}</Text>
    </View>
  );
}
