import AsyncStorage from '@react-native-async-storage/async-storage';
import { Event } from '@/types';

const STORAGE_KEYS = {
  EVENTS: '@golf_events',
  MEMBERS: '@golf_members',
  REGISTRATIONS: '@golf_registrations',
  GROUPINGS: '@golf_groupings',
};

export const storageService = {
  async getEvents(): Promise<Event[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.EVENTS);
      if (data) {
        try {
          return JSON.parse(data);
        } catch (parseError) {
          console.error('Error parsing events, clearing corrupted data:', parseError);
          await AsyncStorage.removeItem(STORAGE_KEYS.EVENTS);
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error('Error loading events:', error);
      return [];
    }
  },

  async addEvent(event: Event): Promise<void> {
    try {
      const events = await this.getEvents();
      events.push(event);
      await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  },

  async updateEvent(id: string, updates: Partial<Event>): Promise<void> {
    try {
      const events = await this.getEvents();
      const index = events.findIndex(e => e.id === id);
      if (index !== -1) {
        events[index] = { ...events[index], ...updates };
        await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
      }
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  },

  async deleteEvent(id: string): Promise<void> {
    try {
      const events = await this.getEvents();
      const filtered = events.filter(e => e.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  },

  async getMembers(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.MEMBERS);
      if (data) {
        try {
          return JSON.parse(data);
        } catch (parseError) {
          console.error('Error parsing members, clearing corrupted data:', parseError);
          await AsyncStorage.removeItem(STORAGE_KEYS.MEMBERS);
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error('Error loading members:', error);
      return [];
    }
  },

  async addMember(member: any): Promise<void> {
    try {
      const members = await this.getMembers();
      members.push(member);
      await AsyncStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    }
  },

  async updateMember(updatedMember: any): Promise<void> {
    try {
      const members = await this.getMembers();
      const index = members.findIndex(m => m.id === updatedMember.id);
      if (index !== -1) {
        members[index] = updatedMember;
        await AsyncStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
      }
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  },

  async deleteMember(id: string): Promise<void> {
    try {
      const members = await this.getMembers();
      const filtered = members.filter(m => m.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting member:', error);
      throw error;
    }
  },



  async getRegistrations(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
      if (data) {
        try {
          return JSON.parse(data);
        } catch (parseError) {
          console.error('Error parsing registrations, clearing corrupted data:', parseError);
          await AsyncStorage.removeItem(STORAGE_KEYS.REGISTRATIONS);
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error('Error loading registrations:', error);
      return [];
    }
  },



  async addRegistration(registration: any): Promise<void> {
    try {
      const registrations = await this.getRegistrations();
      registrations.push(registration);
      await AsyncStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations));
    } catch (error) {
      console.error('Error adding registration:', error);
      throw error;
    }
  },

  async updateRegistration(id: string, updates: any): Promise<any> {
    try {
      const registrations = await this.getRegistrations();
      const index = registrations.findIndex(r => r.id === id);
      if (index !== -1) {
        registrations[index] = { ...registrations[index], ...updates };
        await AsyncStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations));
        return registrations[index];
      }
      throw new Error('Registration not found');
    } catch (error) {
      console.error('Error updating registration:', error);
      throw error;
    }
  },

  async deleteRegistration(id: string): Promise<void> {
    try {
      const registrations = await this.getRegistrations();
      const filtered = registrations.filter(r => r.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting registration:', error);
      throw error;
    }
  },

  async restoreMembers(members: any[], merge: boolean = false): Promise<void> {
    try {
      if (merge) {
        const existingMembers = await this.getMembers();
        const existingIds = new Set(existingMembers.map(m => m.id));
        const newMembers = members.filter(m => !existingIds.has(m.id));
        const mergedMembers = [...existingMembers, ...newMembers];
        await AsyncStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(mergedMembers));
        console.log(`Merged ${newMembers.length} new members (${members.length - newMembers.length} duplicates skipped)`);
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
        console.log(`Replaced with ${members.length} members`);
      }
    } catch (error) {
      console.error('Error restoring members:', error);
      throw error;
    }
  },

  async restoreEvents(events: Event[], merge: boolean = false): Promise<void> {
    try {
      if (merge) {
        const existingEvents = await this.getEvents();
        const existingIds = new Set(existingEvents.map(e => e.id));
        const newEvents = events.filter(e => !existingIds.has(e.id));
        const mergedEvents = [...existingEvents, ...newEvents];
        await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(mergedEvents));
        console.log(`Merged ${newEvents.length} new events (${events.length - newEvents.length} duplicates skipped)`);
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
        console.log(`Replaced with ${events.length} events`);
      }
    } catch (error) {
      console.error('Error restoring events:', error);
      throw error;
    }
  },



  async restoreRegistrations(registrations: any[], merge: boolean = false): Promise<void> {
    try {
      if (merge) {
        const existingRegistrations = await this.getRegistrations();
        const existingIds = new Set(existingRegistrations.map(r => r.id));
        const newRegistrations = registrations.filter(r => !existingIds.has(r.id));
        const mergedRegistrations = [...existingRegistrations, ...newRegistrations];
        await AsyncStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(mergedRegistrations));
        console.log(`Merged ${newRegistrations.length} new registrations (${registrations.length - newRegistrations.length} duplicates skipped)`);
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations));
        console.log(`Replaced with ${registrations.length} registrations`);
      }
    } catch (error) {
      console.error('Error restoring registrations:', error);
      throw error;
    }
  },

  async normalizeAllMemberNames(): Promise<void> {
    try {
      const members = await this.getMembers();
      const normalizedMembers = members.map(member => ({
        ...member,
        name: this.toProperCase(member.name),
        fullName: member.fullName ? this.toProperCase(member.fullName) : member.fullName,
        username: member.username ? this.toProperCase(member.username) : member.username,
      }));
      await AsyncStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(normalizedMembers));
      console.log(`Normalized ${normalizedMembers.length} member names to proper case`);
    } catch (error) {
      console.error('Error normalizing member names:', error);
      throw error;
    }
  },

  toProperCase(str: string): string {
    if (!str) return str;
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  },

  async getGroupings(eventId: string): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem(`${STORAGE_KEYS.GROUPINGS}_${eventId}`);
      if (data) {
        try {
          return JSON.parse(data);
        } catch (parseError) {
          console.error('Error parsing groupings, clearing corrupted data:', parseError);
          await AsyncStorage.removeItem(`${STORAGE_KEYS.GROUPINGS}_${eventId}`);
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error('Error loading groupings:', error);
      return [];
    }
  },

  async saveGroupings(eventId: string, groupings: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(`${STORAGE_KEYS.GROUPINGS}_${eventId}`, JSON.stringify(groupings));
    } catch (error) {
      console.error('Error saving groupings:', error);
      throw error;
    }
  },
};
