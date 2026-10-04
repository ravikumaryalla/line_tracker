import { Modal, View, ScrollView, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from 'react-native';

export default function BottomSheet({ visible, onClose, children }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'flex-end' }}>
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          <View style={{ maxHeight: '85%', backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 22 }}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 8 }}>
              {children}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
