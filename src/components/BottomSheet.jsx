import { Modal, View, TouchableWithoutFeedback } from 'react-native';

export default function BottomSheet({ visible, onClose, children }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'flex-end' }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 22 }}>
          {children}
        </View>
      </View>
    </Modal>
  );
}
