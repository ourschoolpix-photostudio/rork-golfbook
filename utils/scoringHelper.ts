import { getScoresForDay, getAdminScoresForDay } from '@/utils/scorePeristence';

/**
 * Fetch all day scores for a player and calculate grand totals
 * Formula: (day1 + day2 + day3...) - (numberOfDays × handicap)
 * ADMIN SCORES TAKE PRECEDENCE over player-entered scores
 * Uses shared scorePeristence utility (ONE SOURCE OF TRUTH)
 */
export const getPlayerGrandTotals = async (
  eventId: string,
  playerId: string,
  numberOfDays: number = 1,
  handicap: number = 0
) => {
  try {
    console.log(`[scoringHelper] 🔍 Fetching scores for playerId: ${playerId}, eventId: ${eventId}, days: ${numberOfDays}`);
    let grandTotal = 0;

    for (let day = 1; day <= numberOfDays; day++) {
      console.log(`[scoringHelper] ⏳ Fetching scores for day ${day}...`);
      
      const adminScoresData = await getAdminScoresForDay(eventId, day);
      console.log(`[scoringHelper] 🔑 Day ${day} - Checking ADMIN scores for "${playerId}"`);
      
      if (adminScoresData[playerId] && adminScoresData[playerId].scoreTotal !== undefined) {
        const dayScore = adminScoresData[playerId].scoreTotal;
        console.log(`[scoringHelper] ✅ Found ADMIN score (takes precedence): ${dayScore}`);
        grandTotal += dayScore;
        continue;
      }
      
      const scoresData = await getScoresForDay(eventId, day);
      console.log(`[scoringHelper] 📦 Day ${day} - Checking player scores for "${playerId}"`);
        
      if (scoresData[playerId] && scoresData[playerId].scoreTotal !== undefined) {
        const dayScore = scoresData[playerId].scoreTotal;
        console.log(`[scoringHelper] ✅ Found player score: ${dayScore}`);
        grandTotal += dayScore;
      } else {
        console.log(`[scoringHelper] ⚠️ No score found for this day`);
      }
    }

    const grandNet = grandTotal - (numberOfDays * handicap);
    console.log(`[scoringHelper] 🎯 FINAL RESULT: grandTotal=${grandTotal}, grandNet=${grandNet}`);

    return { grandTotal, grandNet };
  } catch (error) {
    console.error('[scoringHelper] ❌ Error calculating grand totals:', error);
    return { grandTotal: 0, grandNet: 0 };
  }
};
