import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface DaySelectorProps {
  numberOfDays: number;
  selectedDay: number;
  onDaySelect: (day: number) => void;
  doubleMode?: boolean;
  onDoubleModeToggle?: (enabled: boolean) => void;
  isAdmin?: boolean;
}

export function DaySelector({ 
  numberOfDays, 
  selectedDay, 
  onDaySelect, 
  doubleMode = false, 
  onDoubleModeToggle,
  isAdmin = false
}: DaySelectorProps) {
  const showDaySelector = numberOfDays > 1;
  const showDoubleButton = onDoubleModeToggle !== undefined && isAdmin;

  if (!showDaySelector && !showDoubleButton) {
    return null;
  }

  return (
    <View style={styles.container}>
      {showDaySelector && Array.from({ length: numberOfDays }, (_, i) => i + 1).map(day => (
        <TouchableOpacity
          key={day}
          style={[styles.dayButton, selectedDay === day && styles.dayButtonActive]}
          onPress={() => onDaySelect(day)}
        >
          <Text style={[styles.dayButtonText, selectedDay === day && styles.dayButtonTextActive]}>
            Day {day}
          </Text>
        </TouchableOpacity>
      ))}
      
      {showDoubleButton && (
        <TouchableOpacity
          style={[styles.dayButton, doubleMode && styles.doubleButtonActive]}
          onPress={() => onDoubleModeToggle(!doubleMode)}
        >
          <Text style={[styles.dayButtonText, doubleMode && styles.doubleButtonTextActive]}>
            Double
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 5,
    paddingBottom: 5,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  dayButton: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#800020',
    backgroundColor: '#800020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonActive: {
    backgroundColor: '#FFD54F',
    borderColor: '#FFD54F',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  dayButtonTextActive: {
    color: '#333',
  },
  doubleButtonActive: {
    backgroundColor: '#FFD54F',
    borderColor: '#FFD54F',
  },
  doubleButtonTextActive: {
    color: '#333',
  },
});
