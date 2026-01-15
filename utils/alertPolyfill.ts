import { Platform, Alert as RNAlert } from 'react-native';

interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

let customAlertHandler: ((title: string, message?: string, buttons?: AlertButton[]) => void) | null = null;

export function setCustomAlertHandler(handler: (title: string, message?: string, buttons?: AlertButton[]) => void) {
  customAlertHandler = handler;
}

export const Alert = {
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: any
  ): void => {
    if (Platform.OS === 'web') {
      const hasCancel = buttons?.some(b => b.style === 'cancel');
      
      if (buttons && buttons.length > 1 && hasCancel) {
        const confirmMessage = message ? `${title}\n\n${message}` : title;
        const result = window.confirm(confirmMessage);
        
        const targetButton = result 
          ? buttons.find(b => b.style !== 'cancel')
          : buttons.find(b => b.style === 'cancel');
        
        if (targetButton?.onPress) {
          targetButton.onPress();
        }
      } else {
        const alertMessage = message ? `${title}\n\n${message}` : title;
        window.alert(alertMessage);
        
        if (buttons && buttons[0]?.onPress) {
          buttons[0].onPress();
        }
      }
    } else {
      if (customAlertHandler) {
        customAlertHandler(title, message, buttons);
      }
    }
  },

  prompt: (
    title: string,
    message?: string,
    callbackOrButtons?: ((text: string) => void) | AlertButton[],
    type?: 'default' | 'plain-text' | 'secure-text' | 'login-password',
    defaultValue?: string,
    keyboardType?: string
  ): void => {
    if (Platform.OS === 'web') {
      const promptMessage = message ? `${title}\n\n${message}` : title;
      const result = window.prompt(promptMessage, defaultValue || '');
      
      if (typeof callbackOrButtons === 'function') {
        if (result !== null) {
          callbackOrButtons(result);
        }
      } else if (Array.isArray(callbackOrButtons)) {
        const targetButton = result !== null 
          ? callbackOrButtons.find(b => b.style !== 'cancel')
          : callbackOrButtons.find(b => b.style === 'cancel');
        
        if (targetButton?.onPress) {
          targetButton.onPress();
        }
      }
    } else {
      RNAlert.prompt(title, message, callbackOrButtons as any, type, defaultValue, keyboardType);
    }
  },
};
