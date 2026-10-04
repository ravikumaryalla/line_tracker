import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../tokens';

const MAX_RESULTS = 8;

// Dropdown that expands in place with a search box. Inline rather than a modal so it also works inside bottom sheets.
// options: [{ id, label, sub? }]. onCreate(name), when given, offers to add the typed text as a new option.
export default function SearchSelect({ value, options, onChange, placeholder = 'Select', searchPlaceholder = 'Search', radius = 8, clearable = true, onCreate }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.id === value);

  const q = query.trim().toLowerCase();
  const matches = options.filter((o) => !q || o.label.toLowerCase().includes(q));
  const shown = matches.slice(0, MAX_RESULTS);
  const exact = options.some((o) => o.label.toLowerCase() === q);

  const close = () => { setOpen(false); setQuery(''); };
  const pick = (id) => { onChange(id); close(); };
  const create = async () => {
    const id = await onCreate(query.trim());
    if (id != null) pick(id);
  };

  return (
    <View>
      <TouchableOpacity onPress={() => (open ? close() : setOpen(true))} style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: open ? colors.brandNavy : colors.neutral300, borderRadius: radius, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#fff' }}>
        <Text style={{ flex: 1, fontSize: 15, color: selected ? colors.fg1 : 'rgba(0,0,0,.4)' }} numberOfLines={1}>{selected ? selected.label : placeholder}</Text>
        {clearable && selected && (
          <TouchableOpacity onPress={() => pick(null)} hitSlop={8} style={{ marginRight: 8 }}>
            <Ionicons name="close-circle" size={18} color="rgba(0,0,0,.35)" />
          </TouchableOpacity>
        )}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="rgba(0,0,0,.5)" />
      </TouchableOpacity>

      {open && (
        <View style={{ marginTop: 6, borderWidth: 1, borderColor: colors.neutral300, borderRadius: 10, backgroundColor: '#fff', overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral200 }}>
            <Ionicons name="search" size={16} color="rgba(0,0,0,.45)" />
            <TextInput value={query} onChangeText={setQuery} placeholder={searchPlaceholder} autoFocus style={{ flex: 1, fontSize: 15, paddingVertical: 11, color: colors.fg1 }} />
          </View>
          {shown.map((o) => (
            <TouchableOpacity key={o.id} onPress={() => pick(o.id)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.neutral100, backgroundColor: o.id === value ? colors.brandPrimary50 : '#fff' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: o.id === value ? '700' : '500', color: colors.fg1 }}>{o.label}</Text>
                {!!o.sub && <Text style={{ fontSize: 12, color: 'rgba(0,0,0,.5)', marginTop: 1 }}>{o.sub}</Text>}
              </View>
              {o.id === value && <Ionicons name="checkmark" size={18} color={colors.brandNavy} />}
            </TouchableOpacity>
          ))}
          {matches.length > MAX_RESULTS && (
            <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.5)', paddingVertical: 9, paddingHorizontal: 14 }}>{matches.length - MAX_RESULTS} more — type to narrow down</Text>
          )}
          {!shown.length && !(onCreate && q) && (
            <Text style={{ fontSize: 13.5, color: 'rgba(0,0,0,.5)', paddingVertical: 12, paddingHorizontal: 14 }}>No matches</Text>
          )}
          {onCreate && q && !exact && (
            <TouchableOpacity onPress={create} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 14 }}>
              <Ionicons name="add-circle" size={18} color={colors.brandNavy} />
              <Text style={{ fontSize: 14.5, fontWeight: '600', color: colors.brandNavy }}>Add "{query.trim()}"</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
