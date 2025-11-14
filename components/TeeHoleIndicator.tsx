import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Grouping, Event } from '@/types';


interface TeeHoleIndicatorProps {
  event: Event;
  grouping: Grouping | null;
  selectedDay: number;
  doubleMode?: boolean;
}

const getHoleAtIndex = (leadingHole: number, groupIndex: number): number => {
  let hole = leadingHole - groupIndex;
  while (hole < 1) {
    hole += 18;
  }
  return hole;
};

const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number, period: 'AM' | 'PM' = 'AM'): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
};

export function TeeHoleIndicator({ event, grouping, selectedDay, doubleMode = false }: TeeHoleIndicatorProps) {
  if (!grouping) {
    return null;
  }

  const dayKey = `day${selectedDay}StartType` as keyof Event;
  const startType = event[dayKey] as string | undefined;
  
  const startTime = selectedDay === 1 
    ? event.day1StartTime 
    : selectedDay === 2 
    ? event.day2StartTime 
    : selectedDay === 3 
    ? event.day3StartTime 
    : undefined;

  const startPeriod = selectedDay === 1 
    ? event.day1StartPeriod || 'AM'
    : selectedDay === 2 
    ? event.day2StartPeriod || 'AM'
    : selectedDay === 3 
    ? event.day3StartPeriod || 'AM'
    : 'AM';

  const leadingHole = selectedDay === 1 
    ? event.day1LeadingHole 
    : selectedDay === 2 
    ? event.day2LeadingHole 
    : selectedDay === 3 
    ? event.day3LeadingHole 
    : undefined;

  const courseName = selectedDay === 1 
    ? event.day1Course 
    : selectedDay === 2 
    ? event.day2Course 
    : selectedDay === 3 
    ? event.day3Course 
    : undefined;

  let displayText = '';
  let label = '';

  if (startType === 'shotgun') {
    if (leadingHole) {
      label = 'Hole #';
      const leadingHoleNum = parseInt(leadingHole, 10);
      let groupIndex = grouping.hole - 1;
      
      if (doubleMode) {
        const pairIndex = Math.floor(groupIndex / 2);
        const actualHole = getHoleAtIndex(leadingHoleNum, pairIndex);
        const suffix = groupIndex % 2 === 0 ? 'A' : 'B';
        displayText = `${actualHole}${suffix}`;
      } else {
        const actualHole = getHoleAtIndex(leadingHoleNum, groupIndex);
        displayText = `${actualHole}`;
      }
    } else {
      label = 'Group';
      displayText = `${grouping.hole}`;
    }
  } else {
    label = 'Start Time';
    if (startTime) {
      const startMinutes = timeToMinutes(startTime);
      const groupIndex = grouping.hole - 1;
      const groupMinutes = startMinutes + groupIndex * 10;
      displayText = minutesToTime(groupMinutes, startPeriod);
    } else {
      displayText = `Group ${grouping.hole}`;
    }
  }

  return (
    <View style={styles.groupIndicator}>
      <Text style={styles.groupIndicatorText}>
        {label}: {displayText} | {courseName || 'Main Course'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  groupIndicator: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E20',
  },
});
