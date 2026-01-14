import { Member, Event } from '@/types';
import { Registration } from '@/utils/registrationService';

/**
 * Calculate course handicap using USGA formula
 * Course Handicap = (Handicap Index × Slope Rating / 113)
 * 
 * @param handicapIndex - The player's handicap index
 * @param slopeRating - The slope rating of the course (default 113)
 * @returns The calculated course handicap
 */
export const calculateCourseHandicap = (handicapIndex: number, slopeRating: number = 113): number => {
  if (!slopeRating || slopeRating === 0) {
    return handicapIndex;
  }
  const courseHandicap = (handicapIndex * slopeRating) / 113;
  return Math.round(courseHandicap * 10) / 10;
};

/**
 * Get the effective handicap for a player in an event.
 * This is the SINGLE SOURCE OF TRUTH for handicap calculation across the app.
 * 
 * Logic (PRIORITY ORDER):
 * 1. If registration has adjustedHandicap and it's not 0 or '0', use adjusted handicap (TAKES PRECEDENCE)
 * 2. If useCourseHandicap is true and event has slope rating, calculate course handicap from base
 * 3. Otherwise, use player's base handicap from member profile
 * 
 * This means: Adjusted handicap always wins, even if course handicap is enabled.
 * This allows some players to play with adjusted handicap while others use course handicap.
 * 
 * This function ensures consistent handicap display across:
 * - Registration screen
 * - Groupings screen
 * - Scoring screen
 * - Rolex leaderboard
 * - Any other event-related screens
 * 
 * @param member - The member/player
 * @param registration - The registration data (contains adjustedHandicap if set)
 * @param event - The event data (contains slope rating)
 * @param useCourseHandicap - Whether to use course handicap calculation
 * @param day - The day number (1, 2, or 3) to get the correct slope rating
 * @returns The effective handicap to use for calculations
 */
export const getDisplayHandicap = (
  member: Member, 
  registration?: Registration | Record<string, any>,
  event?: Event,
  useCourseHandicap: boolean = false,
  day: number = 1
): number => {
  // PRIORITY 1: Check for adjusted handicap in registration
  const adjustedHdc = registration?.adjustedHandicap;
  
  // If adjusted handicap exists and is not 0 or '0', use it (TAKES PRECEDENCE OVER EVERYTHING)
  if (adjustedHdc !== undefined && adjustedHdc !== null && adjustedHdc !== 0 && adjustedHdc !== '0') {
    const adjusted = typeof adjustedHdc === 'string' 
      ? parseFloat(adjustedHdc) 
      : adjustedHdc;
    if (!isNaN(adjusted)) {
      console.log(`[handicapHelper] Using adjusted handicap for ${member.name}: ${adjusted}`);
      return adjusted;
    }
  }
  
  // Get base handicap from member profile
  let baseHandicap: number = 0;
  if (typeof member.handicap === 'string') {
    const parsed = parseFloat(member.handicap);
    baseHandicap = !isNaN(parsed) ? parsed : 0;
  } else {
    baseHandicap = member.handicap ?? 0;
  }
  
  // PRIORITY 2: If course handicap is enabled and event has slope rating, calculate course handicap
  if (useCourseHandicap && event) {
    let slopeRating: number | null = null;
    let slopeRatingStr: string | undefined = undefined;
    
    // Get slope rating based on day
    if (day === 1) {
      slopeRatingStr = event.day1SlopeRating;
    } else if (day === 2) {
      slopeRatingStr = event.day2SlopeRating;
    } else if (day === 3) {
      slopeRatingStr = event.day3SlopeRating;
    }
    
    if (slopeRatingStr) {
      slopeRating = parseFloat(slopeRatingStr);
    }
    
    console.log(`[handicapHelper] 🎯 Course handicap check for ${member.name} on day ${day}:`, {
      useCourseHandicap,
      memberGender: member.gender,
      day1SlopeRating: event.day1SlopeRating,
      day2SlopeRating: event.day2SlopeRating,
      day3SlopeRating: event.day3SlopeRating,
      day1TeeBox: event.day1TeeBox,
      day2TeeBox: event.day2TeeBox,
      day3TeeBox: event.day3TeeBox,
      slopeRatingStr,
      slopeRating,
      baseHandicap,
      eventId: event.id,
      eventName: event.name,
    });
    
    if (slopeRating && !isNaN(slopeRating) && slopeRating > 0) {
      const courseHandicap = calculateCourseHandicap(baseHandicap, slopeRating);
      console.log(`[handicapHelper] ✅ Using COURSE handicap for ${member.name}: ${courseHandicap} (base: ${baseHandicap}, slope: ${slopeRating})`);
      return courseHandicap;
    } else {
      console.log(`[handicapHelper] ⚠️ Course handicap requested but no valid slope rating found for day ${day}`);
      console.log(`[handicapHelper] ⚠️ slopeRatingStr value:`, slopeRatingStr, 'type:', typeof slopeRatingStr);
      console.log(`[handicapHelper] ⚠️ slopeRating parsed value:`, slopeRating, 'type:', typeof slopeRating);
      console.log(`[handicapHelper] ⚠️ Full event data:`, {
        day1SlopeRating: event.day1SlopeRating,
        day2SlopeRating: event.day2SlopeRating,
        day3SlopeRating: event.day3SlopeRating,
        day1CourseRating: event.day1CourseRating,
        day2CourseRating: event.day2CourseRating,
        day3CourseRating: event.day3CourseRating,
        day1Course: event.day1Course,
        day2Course: event.day2Course,
        day3Course: event.day3Course,
        day1CourseId: event.day1CourseId,
        day2CourseId: event.day2CourseId,
        day3CourseId: event.day3CourseId,
      });
      console.log(`[handicapHelper] ⚠️ Falling back to base handicap: ${baseHandicap}`);
    }
  }
  
  // PRIORITY 3: Fall back to base handicap
  console.log(`[handicapHelper] Using base handicap for ${member.name}: ${baseHandicap}`);
  return baseHandicap;
};

/**
 * Check if member has an adjusted handicap for the event
 * This checks if adjusted handicap exists AND is not 0 or '0'
 */
export const hasAdjustedHandicap = (member: Member, registration?: Registration | Record<string, any>): boolean => {
  const adjustedHdc = registration?.adjustedHandicap;
  
  if (adjustedHdc === undefined || adjustedHdc === null || adjustedHdc === 0 || adjustedHdc === '0') {
    return false;
  }
  
  const adjusted = typeof adjustedHdc === 'string' 
    ? parseFloat(adjustedHdc) 
    : adjustedHdc;
  
  return !isNaN(adjusted) && adjusted !== 0;
};

/**
 * Check if course handicap is being used for a player
 */
export const isUsingCourseHandicap = (
  useCourseHandicap: boolean,
  event?: Event,
  day: number = 1
): boolean => {
  if (!useCourseHandicap || !event) return false;
  
  let slopeRating: number | null = null;
  if (day === 1 && event.day1SlopeRating) {
    slopeRating = parseFloat(event.day1SlopeRating);
  } else if (day === 2 && event.day2SlopeRating) {
    slopeRating = parseFloat(event.day2SlopeRating);
  } else if (day === 3 && event.day3SlopeRating) {
    slopeRating = parseFloat(event.day3SlopeRating);
  }
  
  return slopeRating !== null && !isNaN(slopeRating) && slopeRating > 0;
};

/**
 * Get the appropriate label for the handicap being used
 * Returns: 'HDC' for base handicap, 'ADJH' for adjusted handicap, 'CRSE' for course handicap
 */
export const getHandicapLabel = (
  member: Member,
  registration?: Registration | Record<string, any>,
  useCourseHandicap: boolean = false,
  event?: Event,
  day: number = 1
): string => {
  // PRIORITY 1: Check for adjusted handicap (takes precedence over everything)
  if (hasAdjustedHandicap(member, registration)) {
    return 'ADJH:';
  }
  
  // PRIORITY 2: Check if using course handicap
  if (isUsingCourseHandicap(useCourseHandicap, event, day)) {
    return 'CRSE:';
  }
  
  // PRIORITY 3: Base handicap
  return 'HDC:';
};

/**
 * Calculate tournament flight based on handicap and event cutoffs
 */
export const calculateTournamentFlight = (
  member: Member,
  flightACutoff?: number,
  flightBCutoff?: number,
  registration?: Registration,
  event?: Event,
  useCourseHandicap: boolean = false,
  day: number = 1
): string => {
  if (!flightACutoff || !flightBCutoff) {
    return member.flight || member.rolexFlight || '—';
  }

  const handicap = getDisplayHandicap(member, registration, event, useCourseHandicap, day);

  if (handicap <= flightACutoff) {
    return 'A';
  } else if (handicap <= flightBCutoff) {
    return 'B';
  } else {
    return 'C';
  }
};
