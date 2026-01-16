import { supabase } from '@/integrations/supabase/client';

export interface BulkUpdateFields {
  membershipType?: 'active' | 'in-active' | 'guest';
  gender?: 'male' | 'female';
  fullName?: string;
  flight?: 'A' | 'B' | 'C' | 'L';
  rolexFlight?: 'A' | 'B';
  currentHandicap?: number;
  adjustedHandicap?: number;
  ghin?: string;
  rolexPoints?: string;
  phone?: string;
  city?: string;
  state?: string;
  address?: string;
}

/**
 * Convert ALL CAPS text to Title Case (Words With Capitals)
 */
const toTitleCase = (text: string): string => {
  if (!text) return text;
  const upperCount = (text.match(/[A-Z]/g) || []).length;
  const isAllCaps = upperCount > text.length / 2 && text.length > 1;
  if (!isAllCaps) return text;
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const bulkUpdateMembers = async (updates: BulkUpdateFields) => {
  try {
    console.log('[Bulk Update] Starting with updates:', updates);
    
    // Get count of members first
    const { data: members, error: fetchError } = await supabase
      .from('members')
      .select('id, name');
    
    if (fetchError) {
      console.error('[Bulk Update] Failed to fetch members:', fetchError);
      throw fetchError;
    }
    
    const memberCount = members?.length || 0;
    console.log(`[Bulk Update] Found ${memberCount} members to update`);
    
    if (memberCount === 0) {
      return { success: true, updated: 0, total: 0 };
    }

    // Build the Supabase update object
    const supabaseUpdates: Record<string, any> = {};
    
    if (updates.membershipType !== undefined) {
      supabaseUpdates.membership_type = updates.membershipType;
    }
    if (updates.fullName !== undefined) {
      supabaseUpdates.name = toTitleCase(updates.fullName);
      supabaseUpdates.full_name = toTitleCase(updates.fullName);
    }
    if (updates.flight !== undefined) {
      supabaseUpdates.flight = updates.flight;
    }
    if (updates.rolexFlight !== undefined) {
      supabaseUpdates.rolex_flight = updates.rolexFlight;
    }
    if (updates.currentHandicap !== undefined) {
      supabaseUpdates.handicap = updates.currentHandicap;
    }
    if (updates.adjustedHandicap !== undefined) {
      supabaseUpdates.adjusted_handicap = updates.adjustedHandicap;
    }
    if (updates.ghin !== undefined) {
      supabaseUpdates.ghin = updates.ghin;
    }
    if (updates.rolexPoints !== undefined) {
      supabaseUpdates.rolex_points = Number(updates.rolexPoints);
    }
    if (updates.phone !== undefined) {
      supabaseUpdates.phone = updates.phone;
    }
    if (updates.city !== undefined) {
      supabaseUpdates.city = updates.city;
    }
    if (updates.state !== undefined) {
      supabaseUpdates.state = updates.state;
    }
    if (updates.address !== undefined) {
      supabaseUpdates.address = updates.address;
    }
    if (updates.gender !== undefined) {
      supabaseUpdates.gender = updates.gender;
    }

    console.log('[Bulk Update] Applying updates to all members:', supabaseUpdates);

    // Update all members in one query
    const { error: updateError } = await supabase
      .from('members')
      .update(supabaseUpdates)
      .neq('id', ''); // This matches all rows

    if (updateError) {
      console.error('[Bulk Update] Supabase update error:', updateError);
      throw updateError;
    }

    console.log(`[Bulk Update] Successfully updated ${memberCount} members`);
    return {
      success: true,
      updated: memberCount,
      total: memberCount,
    };
  } catch (error) {
    console.error('[Bulk Update] Error:', error);
    throw error;
  }
};
