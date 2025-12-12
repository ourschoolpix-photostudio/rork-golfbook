import { Event } from '@/types';

export type LabelOverride = 'none' | 'teeTime' | 'shotgun';

/**
 * Calculate the golf course hole progression backwards from a leading hole
 * Example: leadingHole=1 → 1, 18, 17, 16...
 * Example: leadingHole=10 → 10, 9, 8, 7...
 */
const getHoleAtIndex = (leadingHole: number, groupIndex: number): number => {
  let hole = leadingHole - groupIndex;
  // Wrap around: if less than 1, go to 18 and count down
  while (hole < 1) {
    hole += 18;
  }
  return hole;
};

/**
 * Convert time string "HH:MM" to minutes since midnight
 */
const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes since midnight back to "HH:MM AM/PM" format
 */
const minutesToTime = (minutes: number, period: 'AM' | 'PM' = 'AM'): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
};

/**
 * Generate a group label based on event configuration and group index
 */
export const generateGroupLabel = (
  groupIndex: number, // 0-based
  event: Event,
  day: number,
  override: LabelOverride = 'none',
  doubleMode: boolean = false
): string => {
  // Get day-specific configuration
  const startType = day === 1 
    ? event.day1StartType 
    : day === 2 
    ? event.day2StartType 
    : day === 3 
    ? event.day3StartType 
    : 'tee-time';
  
  const startTime = day === 1 
    ? event.day1StartTime 
    : day === 2 
    ? event.day2StartTime 
    : day === 3 
    ? event.day3StartTime 
    : undefined;

  const startPeriod = day === 1 
    ? event.day1StartPeriod || 'AM'
    : day === 2 
    ? event.day2StartPeriod || 'AM'
    : day === 3 
    ? event.day3StartPeriod || 'AM'
    : 'AM';

  const leadingHole = day === 1 
    ? event.day1LeadingHole 
    : day === 2 
    ? event.day2LeadingHole 
    : day === 3 
    ? event.day3LeadingHole 
    : undefined;

  // If override is 'teeTime', always show tee time
  if (override === 'teeTime' && startTime) {
    const startMinutes = timeToMinutes(startTime);
    if (doubleMode) {
      const actualGroupIdx = Math.floor(groupIndex / 2);
      const isB = groupIndex % 2 === 1;
      const groupMinutes = startMinutes + actualGroupIdx * 10;
      return `${minutesToTime(groupMinutes, startPeriod)}${isB ? 'B' : 'A'}`;
    } else {
      const groupMinutes = startMinutes + groupIndex * 10;
      return minutesToTime(groupMinutes, startPeriod);
    }
  }

  // If override is 'shotgun', always show shotgun (hole or group numbers)
  if (override === 'shotgun') {
    if (leadingHole) {
      const leadingHoleNum = parseInt(leadingHole, 10);
      if (doubleMode) {
        const actualGroupIdx = Math.floor(groupIndex / 2);
        const isB = groupIndex % 2 === 1;
        const hole = getHoleAtIndex(leadingHoleNum, actualGroupIdx);
        return `Hole ${hole}${isB ? 'B' : 'A'}`;
      } else {
        const hole = getHoleAtIndex(leadingHoleNum, groupIndex);
        return `Hole ${hole}`;
      }
    } else {
      // No leading hole specified, use group numbers
      if (doubleMode) {
        const actualGroupIdx = Math.floor(groupIndex / 2);
        const isB = groupIndex % 2 === 1;
        return `Group ${actualGroupIdx + 1}${isB ? 'B' : 'A'}`;
      } else {
        return `Group ${groupIndex + 1}`;
      }
    }
  }

  // Otherwise, follow natural start type
  if (startType === 'shotgun') {
    if (leadingHole) {
      const leadingHoleNum = parseInt(leadingHole, 10);
      if (doubleMode) {
        const actualGroupIdx = Math.floor(groupIndex / 2);
        const isB = groupIndex % 2 === 1;
        const hole = getHoleAtIndex(leadingHoleNum, actualGroupIdx);
        return `Hole ${hole}${isB ? 'B' : 'A'}`;
      } else {
        const hole = getHoleAtIndex(leadingHoleNum, groupIndex);
        return `Hole ${hole}`;
      }
    } else {
      // No leading hole specified, use group numbers
      if (doubleMode) {
        const actualGroupIdx = Math.floor(groupIndex / 2);
        const isB = groupIndex % 2 === 1;
        return `Group ${actualGroupIdx + 1}${isB ? 'B' : 'A'}`;
      } else {
        return `Group ${groupIndex + 1}`;
      }
    }
  }

  // Default: tee time
  if (startTime) {
    const startMinutes = timeToMinutes(startTime);
    if (doubleMode) {
      const actualGroupIdx = Math.floor(groupIndex / 2);
      const isB = groupIndex % 2 === 1;
      const groupMinutes = startMinutes + actualGroupIdx * 10;
      return `${minutesToTime(groupMinutes, startPeriod)}${isB ? 'B' : 'A'}`;
    } else {
      const groupMinutes = startMinutes + groupIndex * 10;
      return minutesToTime(groupMinutes, startPeriod);
    }
  }

  // Fallback
  if (doubleMode) {
    const actualGroupIdx = Math.floor(groupIndex / 2);
    const isB = groupIndex % 2 === 1;
    return `Group ${actualGroupIdx + 1}${isB ? 'B' : 'A'}`;
  }
  return `Group ${groupIndex + 1}`;
};
