import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { api } from '../api';
import { initials } from '../format';
import { colors } from '../tokens';

// Shrinks the picked image so it fits comfortably in the database as a data URI.
async function toDataUri(uri) {
  const out = await manipulateAsync(uri, [{ resize: { width: 400 } }], { compress: 0.6, format: SaveFormat.JPEG, base64: true });
  return `data:image/jpeg;base64,${out.base64}`;
}

export default function PhotoPicker({ value, onChange, onError }) {
  const pick = async (fromCamera) => {
    try {
      const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { onError?.(fromCamera ? 'Camera permission denied' : 'Gallery permission denied'); return; }
      const opts = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 };
      const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled || !res.assets?.length) return;
      onChange(await toDataUri(res.assets[0].uri));
    } catch (e) {
      onError?.('Could not load photo');
    }
  };

  const btn = { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.brandNavy, paddingVertical: 9, paddingHorizontal: 12 };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View>
        <View style={{ width: 64, height: 64, borderRadius: 9999, backgroundColor: colors.neutral200, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {value ? <Image source={{ uri: value }} style={{ width: 64, height: 64 }} /> : <Ionicons name="person" size={28} color="rgba(0,0,0,.35)" />}
        </View>
        {value && (
          <TouchableOpacity onPress={() => onChange(null)} style={{ position: 'absolute', top: -4, right: -4, width: 22, height: 22, borderRadius: 9999, backgroundColor: colors.neutral300, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={14} color="rgba(0,0,0,.7)" />
          </TouchableOpacity>
        )}
      </View>
      <View style={{ gap: 8 }}>
        <TouchableOpacity onPress={() => pick(true)} style={btn}>
          <Ionicons name="camera" size={16} color={colors.brandNavy} />
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.brandNavy }}>Take photo</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => pick(false)} style={btn}>
          <Ionicons name="images" size={16} color={colors.brandNavy} />
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.brandNavy }}>Choose from gallery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Round avatar that shows the customer's stored photo when they have one, initials otherwise.
export function CustomerAvatar({ customer, size = 56 }) {
  const [photo, setPhoto] = useState(null);
  useEffect(() => {
    setPhoto(null);
    if (!customer.hasPhoto) return;
    let live = true;
    api.customers.photo(customer.id).then((r) => { if (live) setPhoto(r.photo); }).catch(() => {});
    return () => { live = false; };
  }, [customer.id, customer.hasPhoto]);

  return (
    <View style={{ width: size, height: size, borderRadius: 9999, backgroundColor: colors.neutral200, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {photo
        ? <Image source={{ uri: photo }} style={{ width: size, height: size }} />
        : <Text style={{ fontSize: 15, fontWeight: '700', color: 'rgba(0,0,0,.55)' }}>{initials(customer.name)}</Text>}
    </View>
  );
}
