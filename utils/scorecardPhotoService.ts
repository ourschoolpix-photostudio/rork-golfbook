import { supabase } from '@/integrations/supabase/client';
import { photoService } from './photoService';

const BUCKET_NAME = 'rork-event-photos';

export interface ScorecardPhoto {
  id: string;
  event_id: string;
  group_label: string;
  photo_url: string;
  day?: number;
  tee?: string;
  hole_range?: string;
  created_at: string;
  created_by?: string;
}

export const scorecardPhotoService = {
  async savePhoto(
    eventId: string,
    groupLabel: string,
    photoUri: string,
    metadata?: {
      day?: number;
      tee?: string;
      holeRange?: string;
      createdBy?: string;
    }
  ): Promise<ScorecardPhoto | null> {
    try {
      console.log('📸 Uploading scorecard photo to cloud storage...');
      
      const response = await fetch(photoUri);
      const blob = await response.blob();
      
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64String = reader.result?.toString().split(',')[1];
          if (!base64String) {
            reject(new Error('Failed to convert photo to base64'));
          } else {
            resolve(base64String);
          }
        };
        reader.onerror = () => reject(new Error('FileReader error'));
      });
      
      reader.readAsDataURL(blob);
      const base64Data = await base64Promise;
      
      const filename = `${eventId}/scorecards/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filename, decode(base64Data), {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });
      
      if (uploadError) {
        console.error('❌ Error uploading photo:', uploadError);
        throw uploadError;
      }
      
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filename);
      
      const photoUrl = urlData.publicUrl;
      
      console.log('✅ Photo uploaded to:', photoUrl);
      console.log('💾 Saving photo record to database...');
      
      const { data, error } = await supabase
        .from('scorecard_photos')
        .insert({
          event_id: eventId,
          group_label: groupLabel,
          photo_url: photoUrl,
          day: metadata?.day,
          tee: metadata?.tee,
          hole_range: metadata?.holeRange,
          created_by: metadata?.createdBy,
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error saving photo record:', error);
        await photoService.deletePhoto(photoUrl);
        throw error;
      }
      
      console.log('✅ Scorecard photo saved successfully');
      return data as ScorecardPhoto;
    } catch (error) {
      console.error('❌ Error saving scorecard photo:', error);
      return null;
    }
  },
  
  async getPhotosByEvent(eventId: string): Promise<ScorecardPhoto[]> {
    try {
      const { data, error } = await supabase
        .from('scorecard_photos')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching scorecard photos:', error);
        return [];
      }
      
      return (data as ScorecardPhoto[]) || [];
    } catch (error) {
      console.error('❌ Error fetching scorecard photos:', error);
      return [];
    }
  },
  
  async getPhotosByGroup(eventId: string, groupLabel: string): Promise<ScorecardPhoto[]> {
    try {
      const { data, error } = await supabase
        .from('scorecard_photos')
        .select('*')
        .eq('event_id', eventId)
        .eq('group_label', groupLabel)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching group scorecard photos:', error);
        return [];
      }
      
      return (data as ScorecardPhoto[]) || [];
    } catch (error) {
      console.error('❌ Error fetching group scorecard photos:', error);
      return [];
    }
  },
  
  async deletePhoto(photoId: string, photoUrl: string): Promise<boolean> {
    try {
      console.log('🗑️ Deleting scorecard photo...');
      
      const { error: dbError } = await supabase
        .from('scorecard_photos')
        .delete()
        .eq('id', photoId);
      
      if (dbError) {
        console.error('❌ Error deleting photo record:', dbError);
        throw dbError;
      }
      
      await photoService.deletePhoto(photoUrl);
      
      console.log('✅ Scorecard photo deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Error deleting scorecard photo:', error);
      return false;
    }
  },
  
  async deleteAllEventPhotos(eventId: string): Promise<boolean> {
    try {
      console.log('🗑️ Deleting all scorecard photos for event...');
      
      const photos = await this.getPhotosByEvent(eventId);
      
      for (const photo of photos) {
        await photoService.deletePhoto(photo.photo_url);
      }
      
      const { error } = await supabase
        .from('scorecard_photos')
        .delete()
        .eq('event_id', eventId);
      
      if (error) {
        console.error('❌ Error deleting photo records:', error);
        throw error;
      }
      
      console.log('✅ All scorecard photos deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Error deleting all scorecard photos:', error);
      return false;
    }
  },
};

function decode(base64String: string): Uint8Array {
  const binaryString = atob(base64String);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
