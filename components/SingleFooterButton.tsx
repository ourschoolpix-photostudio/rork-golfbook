import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

type SingleFooterButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  icon?: LucideIcon;
  iconColor?: string;
  variant?: 'default' | 'active' | 'inactive';
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function SingleFooterButton({
  label,
  onPress,
  disabled = false,
  icon: Icon,
  iconColor,
  variant = 'default',
  style,
  textStyle,
}: SingleFooterButtonProps) {
  const getButtonStyle = () => {
    switch (variant) {
      case 'active':
        return styles.buttonActive;
      case 'inactive':
        return styles.buttonInactive;
      default:
        return styles.buttonDefault;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'active':
      case 'inactive':
        return styles.textActiveInactive;
      default:
        return styles.textDefault;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        disabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      {Icon && (
        <Icon size={16} color={iconColor || '#FFD54F'} style={styles.icon} />
      )}
      <Text style={[styles.text, getTextStyle(), textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
  },
  buttonDefault: {
    backgroundColor: '#FDB813',
    borderColor: '#800020',
  },
  buttonActive: {
    backgroundColor: '#800020',
    borderColor: '#FFD54F',
  },
  buttonInactive: {
    backgroundColor: '#800020',
    borderColor: '#FFD54F',
  },
  buttonDisabled: {
    backgroundColor: '#9E9E9E',
    opacity: 0.7,
  },
  text: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  textDefault: {
    color: '#800020',
  },
  textActiveInactive: {
    color: '#FFD54F',
  },
  icon: {
    marginRight: 6,
  },
});
