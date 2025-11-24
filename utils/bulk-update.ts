import { storageService } from './storage';
import { Member } from '@/types';

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
  // If it's already mixed case or mostly lowercase, leave it
  const upperCount = (text.match(/[A-Z]/g) || []).length;
  const isAllCaps = upperCount > text.length / 2 && text.length > 1;
  if (!isAllCaps) return text;
  // Convert to title case
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const bulkUpdateMembers = async (updates: BulkUpdateFields) => {
  try {
    console.log('Starting bulk member update with:', updates);
    const members = await storageService.getMembers();
    console.log(`Found ${members.length} members to update`);
    let updated = 0;
    for (const member of members) {
      const updatedMember: Member = {
        ...member,
      };

      // Only update fields that have values
      if (updates.membershipType) updatedMember.membershipType = updates.membershipType;
      if (updates.fullName) updatedMember.name = toTitleCase(updates.fullName);
      if (updates.flight) updatedMember.flight = updates.flight;
      if (updates.rolexFlight) updatedMember.rolexFlight = updates.rolexFlight;
      if (updates.currentHandicap !== undefined) updatedMember.handicap = updates.currentHandicap;
      if (updates.adjustedHandicap !== undefined) updatedMember.adjustedHandicap = String(updates.adjustedHandicap);
      if (updates.ghin) updatedMember.ghin = updates.ghin;
      if (updates.rolexPoints) updatedMember.rolexPoints = Number(updates.rolexPoints);
      if (updates.phone) updatedMember.phone = updates.phone;
      if (updates.city) updatedMember.city = updates.city;
      if (updates.state) updatedMember.state = updates.state;
      if (updates.address) updatedMember.address = updates.address;
      await storageService.updateMember(updatedMember);
      updated++;
      console.log(`Updated ${updated}/${members.length}: ${updatedMember.name}`);
    }
    console.log(`Bulk update complete: ${updated} members updated`);
    return {
      success: true,
      updated,
      total: members.length,
    };
  } catch (error) {
    console.error('Bulk update error:', error);
    throw error;
  }
};
