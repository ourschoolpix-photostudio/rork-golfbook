import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onClose: () => void;
}

export function CustomAlert({ visible, title, message, buttons = [{ text: 'OK' }], onClose }: CustomAlertProps) {
  const handleButtonPress = (button: AlertButton) => {
    onClose();
    if (button.onPress) {
      setTimeout(() => button.onPress!(), 100);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          <View style={styles.contentContainer}>
            <Text style={styles.title}>{title}</Text>
            {message && <Text style={styles.message}>{message}</Text>}
          </View>
          
          <View style={styles.separator} />
          
          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => {
              const isDestructive = button.style === 'destructive';
              const isCancel = button.style === 'cancel';
              const buttonText = button.text || 'OK';
              
              return (
                <React.Fragment key={index}>
                  {index > 0 && <View style={styles.buttonSeparator} />}
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() => handleButtonPress(button)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isDestructive && styles.destructiveText,
                        isCancel && styles.cancelText,
                      ]}
                    >
                      {buttonText}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: '100%',
    maxWidth: 270,
    overflow: 'hidden',
  },
  contentContainer: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: '#000000',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  separator: {
    height: 0.5,
    backgroundColor: '#C8C7CC',
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  buttonSeparator: {
    width: 0.5,
    backgroundColor: '#C8C7CC',
  },
  button: {
    flex: 1,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '400',
  },
  cancelText: {
    fontWeight: '600',
  },
  destructiveText: {
    color: '#FF3B30',
  },
});
