import { View, Text, TouchableOpacity } from 'react-native';
import BottomSheet from './BottomSheet';
import { colors } from '../tokens';
import { F } from '../format';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'];

export default function KeypadSheet({ visible, name, sub, weekly, due = weekly, remaining, amount, onKey, onSave, onClose, saving }) {
  const value = parseInt(amount, 10) || 0;
  const chips = [weekly, Math.round(weekly / 2), weekly * 2].filter((c) => c <= remaining);
  if (remaining > 0 && remaining < weekly * 2 && !chips.includes(remaining)) chips.push(remaining);
  const extra = Math.min(value, remaining) - due;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 19, fontWeight: '700' }}>{name}</Text>
          <Text style={{ fontSize: 13, color: 'rgba(0,0,0,.55)', marginTop: 1 }}>{sub}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={{ paddingHorizontal: 6 }}>
          <Text style={{ fontSize: 22, color: 'rgba(0,0,0,.4)' }}>×</Text>
        </TouchableOpacity>
      </View>

      <View style={{ backgroundColor: colors.neutral100, borderRadius: 12, padding: 16, marginTop: 14, alignItems: 'center' }}>
        <Text style={{ fontSize: 11.5, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(0,0,0,.5)' }}>Amount received</Text>
        <Text style={{ fontSize: 42, fontWeight: '700', color: colors.brandNavy, marginTop: 4 }}>
          {amount ? F(value) : '₹0'}
        </Text>
        <Text style={{ fontSize: 12.5, color: value > remaining ? colors.error800 : 'rgba(0,0,0,.55)', marginTop: 2 }}>
          {value > remaining ? `More than the balance of ${F(remaining)}` : extra > 0 ? `${F(extra)} more than this week's due` : `Balance ${F(remaining)}`}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {chips.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => onKey('set', String(c))}
            style={{ flex: 1, alignItems: 'center', borderWidth: 1, borderColor: colors.neutral300, borderRadius: 9999, paddingVertical: 9 }}
          >
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.brandNavy }}>{F(c)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {DIGITS.map((k) => (
          <TouchableOpacity
            key={k}
            onPress={() => onKey('press', k)}
            style={{ width: '31%', backgroundColor: colors.neutral100, borderRadius: 10, paddingVertical: 15, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 22, fontWeight: '600', color: 'rgba(0,0,0,.8)' }}>{k}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={onSave}
        disabled={saving}
        style={{ marginTop: 14, alignItems: 'center', backgroundColor: colors.success600, borderRadius: 10, padding: 16, opacity: saving ? 0.7 : 1 }}
      >
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>
          {saving ? 'Saving…' : amount ? `Save ${F(parseInt(amount, 10) || 0)} as paid` : 'Save as paid'}
        </Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}
