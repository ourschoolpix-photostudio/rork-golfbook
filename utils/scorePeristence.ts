import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Hole-by-Hole Score Persistence
 * Format: { [playerId]: { holes: { [holeNumber]: score }, scoreTotal: number } }
 * Storage Key: event_scores_${eventId}_day${day}
 */

export interface PlayerHoleScores {
  holes: { [holeNumber: number]: number };
  scoreTotal: number;
}

export async function saveScoresForDay(
  eventId: string,
  day: number,
  scores: { [playerId: string]: { scoreTotal: number } }
): Promise<void> {
  try {
    const storageKey = `event_scores_${eventId}_day${day}`;
    const existingData = await AsyncStorage.getItem(storageKey);
    const existingScores = existingData ? JSON.parse(existingData) : {};

    // Merge new scores with existing
    const mergedScores = { ...existingScores, ...scores };

    await AsyncStorage.setItem(storageKey, JSON.stringify(mergedScores));
    console.log(`[scorePeristence] ✅ Saved scores for day ${day}:`, mergedScores);
  } catch (error) {
    console.error(`[scorePeristence] Error saving scores:`, error);
    throw error;
  }
}

export async function getScoresForDay(
  eventId: string,
  day: number
): Promise<{ [playerId: string]: { scoreTotal: number } }> {
  try {
    const holeScoresKey = `event_hole_scores_${eventId}_day${day}`;
    const holeScoresData = await AsyncStorage.getItem(holeScoresKey);
    if (holeScoresData) {
      const parsedHoleScores: { [playerId: string]: PlayerHoleScores } = JSON.parse(holeScoresData);
      const scores: { [playerId: string]: { scoreTotal: number } } = {};
      
      Object.entries(parsedHoleScores).forEach(([playerId, data]) => {
        scores[playerId] = { scoreTotal: data.scoreTotal };
      });
      
      console.log(`[scorePeristence] ✅ Loaded scores for day ${day} from hole scores:`, scores);
      return scores;
    }
    
    const storageKey = `event_scores_${eventId}_day${day}`;
    const savedData = await AsyncStorage.getItem(storageKey);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      console.log(`[scorePeristence] ✅ Loaded scores for day ${day} (legacy format):`, parsed);
      return parsed;
    }
    return {};
  } catch (error) {
    console.error(`[scorePeristence] Error loading scores:`, error);
    return {};
  }
}

// NEW: Hole-by-hole score persistence
export async function saveHoleScoresForDay(
  eventId: string,
  day: number,
  playerId: string,
  holeNumber: number,
  score: number
): Promise<void> {
  try {
    const storageKey = `event_hole_scores_${eventId}_day${day}`;
    const existingData = await AsyncStorage.getItem(storageKey);
    const existingScores: { [playerId: string]: PlayerHoleScores } = existingData ? JSON.parse(existingData) : {};

    // Initialize player data if not exists
    if (!existingScores[playerId]) {
      existingScores[playerId] = { holes: {}, scoreTotal: 0 };
    }

    // Update hole score
    existingScores[playerId].holes[holeNumber] = score;

    // Recalculate total
    existingScores[playerId].scoreTotal = Object.values(existingScores[playerId].holes).reduce(
      (sum, holeScore) => sum + holeScore,
      0
    );

    await AsyncStorage.setItem(storageKey, JSON.stringify(existingScores));
    console.log(`[scorePeristence] ✅ Saved hole ${holeNumber} score for player ${playerId} on day ${day}:`, score);
  } catch (error) {
    console.error(`[scorePeristence] Error saving hole scores:`, error);
    throw error;
  }
}

export async function getHoleScoresForDay(
  eventId: string,
  day: number
): Promise<{ [playerId: string]: PlayerHoleScores }> {
  try {
    const storageKey = `event_hole_scores_${eventId}_day${day}`;
    const savedData = await AsyncStorage.getItem(storageKey);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      console.log(`[scorePeristence] ✅ Loaded hole scores for day ${day}:`, parsed);
      return parsed;
    }
    return {};
  } catch (error) {
    console.error(`[scorePeristence] Error loading hole scores:`, error);
    return {};
  }
}

export async function getHoleScoresForEvent(eventId: string): Promise<Record<number, { [playerId: string]: PlayerHoleScores }>> {
  try {
    const allScores: Record<number, { [playerId: string]: PlayerHoleScores }> = {};

    // Load all days (1-10 to be thorough)
    for (let day = 1; day <= 10; day++) {
      const dayScores = await getHoleScoresForDay(eventId, day);
      if (Object.keys(dayScores).length > 0) {
        allScores[day] = dayScores;
      }
    }

    console.log(`[scorePeristence] ✅ Loaded all hole scores for event`, allScores);
    return allScores;
  } catch (error) {
    console.error(`[scorePeristence] Error loading event hole scores:`, error);
    return {};
  }
}

export async function getScoresForEvent(eventId: string): Promise<Record<number, { [playerId: string]: { scoreTotal: number } }>> {
  try {
    const allScores: Record<number, { [playerId: string]: { scoreTotal: number } }> = {};

    // Load all days (1-10 to be thorough - match clearScoresForEvent)
    for (let day = 1; day <= 10; day++) {
      const dayScores = await getScoresForDay(eventId, day);
      if (Object.keys(dayScores).length > 0) {
        allScores[day] = dayScores;
      }
    }

    console.log(`[scorePeristence] ✅ Loaded all scores for event`, allScores);
    return allScores;
  } catch (error) {
    console.error(`[scorePeristence] Error loading event scores:`, error);
    return {};
  }
}

export async function saveAdminScoresForDay(
  eventId: string,
  day: number,
  scores: { [playerId: string]: { scoreTotal: number } }
): Promise<void> {
  try {
    const storageKey = `event_admin_scores_${eventId}_day${day}`;
    const existingData = await AsyncStorage.getItem(storageKey);
    const existingScores = existingData ? JSON.parse(existingData) : {};

    const mergedScores = { ...existingScores, ...scores };

    await AsyncStorage.setItem(storageKey, JSON.stringify(mergedScores));
    console.log(`[scorePeristence] ✅ Saved ADMIN scores for day ${day}:`, mergedScores);
  } catch (error) {
    console.error(`[scorePeristence] Error saving admin scores:`, error);
    throw error;
  }
}

export async function getAdminScoresForDay(
  eventId: string,
  day: number
): Promise<{ [playerId: string]: { scoreTotal: number } }> {
  try {
    const storageKey = `event_admin_scores_${eventId}_day${day}`;
    const savedData = await AsyncStorage.getItem(storageKey);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      console.log(`[scorePeristence] ✅ Loaded ADMIN scores for day ${day}:`, parsed);
      return parsed;
    }
    return {};
  } catch (error) {
    console.error(`[scorePeristence] Error loading admin scores:`, error);
    return {};
  }
}

export async function getAdminScoresForEvent(eventId: string): Promise<Record<number, { [playerId: string]: { scoreTotal: number } }>> {
  try {
    const allScores: Record<number, { [playerId: string]: { scoreTotal: number } }> = {};

    for (let day = 1; day <= 10; day++) {
      const dayScores = await getAdminScoresForDay(eventId, day);
      if (Object.keys(dayScores).length > 0) {
        allScores[day] = dayScores;
      }
    }

    console.log(`[scorePeristence] ✅ Loaded all ADMIN scores for event`, allScores);
    return allScores;
  } catch (error) {
    console.error(`[scorePeristence] Error loading event admin scores:`, error);
    return {};
  }
}

export async function clearScoresForEvent(eventId: string): Promise<void> {
  try {
    console.log(`[scorePeristence] 🧹 CLEARING ALL SCORES for event ${eventId}`);
    
    for (let day = 1; day <= 10; day++) {
      const storageKey = `event_scores_${eventId}_day${day}`;
      const holeScoresKey = `event_hole_scores_${eventId}_day${day}`;
      const adminScoresKey = `event_admin_scores_${eventId}_day${day}`;
      await AsyncStorage.removeItem(storageKey);
      await AsyncStorage.removeItem(holeScoresKey);
      await AsyncStorage.removeItem(adminScoresKey);
      console.log(`[scorePeristence] ✅ Removed keys: ${storageKey}, ${holeScoresKey}, ${adminScoresKey}`);
    }
    
    console.log(`[scorePeristence] ✅ Cleared all scores for event ${eventId}`);

    console.log(`[scorePeristence] 🔍 VERIFYING deletion (this is critical)...`);
    let anyRemaining = false;
    for (let day = 1; day <= 10; day++) {
      const storageKey = `event_scores_${eventId}_day${day}`;
      const holeScoresKey = `event_hole_scores_${eventId}_day${day}`;
      const adminScoresKey = `event_admin_scores_${eventId}_day${day}`;
      const verify = await AsyncStorage.getItem(storageKey);
      const verifyHole = await AsyncStorage.getItem(holeScoresKey);
      const verifyAdmin = await AsyncStorage.getItem(adminScoresKey);
      if (verify) {
        console.error(`[scorePeristence] ❌ ALERT: Key still exists after removeItem: ${storageKey} = ${verify}`);
        anyRemaining = true;
        await AsyncStorage.removeItem(storageKey);
        console.log(`[scorePeristence] 🔄 Re-attempted removal of: ${storageKey}`);
      } else {
        console.log(`[scorePeristence] ✅ Confirmed deleted: ${storageKey}`);
      }
      if (verifyHole) {
        console.error(`[scorePeristence] ❌ ALERT: Key still exists after removeItem: ${holeScoresKey} = ${verifyHole}`);
        anyRemaining = true;
        await AsyncStorage.removeItem(holeScoresKey);
        console.log(`[scorePeristence] 🔄 Re-attempted removal of: ${holeScoresKey}`);
      } else {
        console.log(`[scorePeristence] ✅ Confirmed deleted: ${holeScoresKey}`);
      }
      if (verifyAdmin) {
        console.error(`[scorePeristence] ❌ ALERT: Key still exists after removeItem: ${adminScoresKey} = ${verifyAdmin}`);
        anyRemaining = true;
        await AsyncStorage.removeItem(adminScoresKey);
        console.log(`[scorePeristence] 🔄 Re-attempted removal of: ${adminScoresKey}`);
      } else {
        console.log(`[scorePeristence] ✅ Confirmed deleted: ${adminScoresKey}`);
      }
    }
    
    if (!anyRemaining) {
      console.log(`[scorePeristence] ✅✅✅ ALL SCORES CONFIRMED DELETED`);
    }
  } catch (error) {
    console.error(`[scorePeristence] Error clearing scores:`, error);
  }
}
