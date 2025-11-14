import { getScoresForDay, getAdminScoresForDay } from '@/utils/scorePeristence';
import { getPlayerGrandTotals } from '@/utils/scoringHelper';
export type { LabelOverride } from './groupLabelHelper';

/**
 * Load scores from storage and attach them to slot players
 * ADMIN SCORES TAKE PRECEDENCE over player-entered scores
 * Scores are event/day-specific, handicaps come from member objects already
 * Uses shared scorePeristence utility (ONE SOURCE OF TRUTH)
 */
export const enrichSlotsWithScores = async (
  slots: (any | null)[],
  eventId: string,
  day: number
) => {
  try {
    const adminScoresData = await getAdminScoresForDay(eventId, day);
    const scoresData = await getScoresForDay(eventId, day);
    
    const enrichedSlots = slots.map(player => {
      if (!player || !player.id) return player;
      
      const adminScoreData = adminScoresData[player.id];
      if (adminScoreData) {
        console.log(`[groupingsHelper] ✅ Using ADMIN score for ${player.name}: ${adminScoreData.scoreTotal}`);
        return {
          ...player,
          scoreTotal: adminScoreData.scoreTotal,
        };
      }
      
      const playerScoreData = scoresData[player.id];
      if (playerScoreData) {
        console.log(`[groupingsHelper] 📦 Using player score for ${player.name}: ${playerScoreData.scoreTotal}`);
        return {
          ...player,
          scoreTotal: playerScoreData.scoreTotal,
        };
      }
      
      return player;
    });

    return enrichedSlots;
  } catch (error) {
    console.error('[groupingsHelper] Error enriching slots with scores:', error);
    return slots;
  }
};

export const enrichSlotsWithGrandTotalScores = async (
  slots: (any | null)[],
  eventId: string,
  numberOfDays: number = 2
) => {
  try {
    console.log(`[groupingsHelper] 🚀 Starting enrichSlotsWithGrandTotalScores for eventId: ${eventId}, numberOfDays: ${numberOfDays}`);
    console.log(`[groupingsHelper] 📥 Input slots:`, slots.map(s => s ? { id: s.id, name: s.name, scoreTotal: s.scoreTotal } : null));
    
    const allDaysScores: { [playerId: string]: number } = {};
    
    for (let day = 1; day <= numberOfDays; day++) {
      console.log(`[groupingsHelper] 🔍 Loading scores for day ${day}...`);
      const adminScoresData = await getAdminScoresForDay(eventId, day);
      const scoresData = await getScoresForDay(eventId, day);
      
      console.log(`[groupingsHelper] Day ${day} - Admin scores:`, Object.keys(adminScoresData).length, 'players');
      console.log(`[groupingsHelper] Day ${day} - Player scores:`, Object.keys(scoresData).length, 'players');
      
      Object.entries(adminScoresData).forEach(([playerId, data]: [string, any]) => {
        if (!allDaysScores[playerId]) {
          allDaysScores[playerId] = 0;
        }
        allDaysScores[playerId] += data.scoreTotal;
        console.log(`[groupingsHelper] 🔑 Day ${day}: Adding ADMIN score for ${playerId}: ${data.scoreTotal} (running total: ${allDaysScores[playerId]})`);
      });
      
      Object.entries(scoresData).forEach(([playerId, data]: [string, any]) => {
        if (adminScoresData[playerId]) {
          console.log(`[groupingsHelper] ⏭️ Day ${day}: Skipping player score for ${playerId} (admin score exists)`);
          return;
        }
        if (!allDaysScores[playerId]) {
          allDaysScores[playerId] = 0;
        }
        allDaysScores[playerId] += data.scoreTotal;
        console.log(`[groupingsHelper] 📦 Day ${day}: Adding player score for ${playerId}: ${data.scoreTotal} (running total: ${allDaysScores[playerId]})`);
      });
    }
    
    console.log(`[groupingsHelper] 📊 Final aggregated scores for all days:`, allDaysScores);
    
    const enrichedSlots = slots.map(player => {
      if (!player || !player.id) return player;
      
      const grandTotal = allDaysScores[player.id];
      if (grandTotal !== undefined) {
        console.log(`[groupingsHelper] ✅ Enriching ${player.name} with score: ${grandTotal}`);
        return {
          ...player,
          scoreTotal: grandTotal,
        };
      }
      
      console.log(`[groupingsHelper] ⚠️ No score found for ${player.name}`);
      return player;
    });

    console.log(`[groupingsHelper] 📤 Output enriched slots:`, enrichedSlots.map(s => s ? { id: s.id, name: s.name, scoreTotal: s.scoreTotal } : null));
    return enrichedSlots;
  } catch (error) {
    console.error('[groupingsHelper] Error enriching slots with grand total scores:', error);
    return slots;
  }
};

/**
 * Enrich all groups with scores for all day slots
 */
export const enrichGroupsWithScores = async (
  groups: any[],
  eventId: string,
  numberOfDays: number = 2
) => {
  try {
    // Load scores from ALL days and calculate grand total
    const enrichedGroups = await Promise.all(
      groups.map(async (group) => {
        const enrichedSlots = await enrichSlotsWithGrandTotalScores(
          group.slots,
          eventId,
          numberOfDays
        );
        return {
          ...group,
          slots: enrichedSlots,
        };
      })
    );
    return enrichedGroups;
  } catch (error) {
    console.error('[groupingsHelper] Error enriching groups with scores:', error);
    return groups;
  }
};
