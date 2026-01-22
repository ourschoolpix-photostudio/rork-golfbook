import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/integrations/supabase/client';
import { Platform } from 'react-native';

const BUCKET_NAME = 'rork-event-photos';

export const photoService = {
  async pickImage() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Photo library permission denied');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0];
      }

      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      throw error;
    }
  },

  async compressImage(asset: any, isSquare: boolean = false) {
    try {
      console.log('🖼️ Compressing image for optimal quality...');
      const resizeOptions = isSquare 
        ? { width: 800 } 
        : { width: 1200, height: 900 };
      
      const isPNG = asset.uri.toLowerCase().includes('.png') || asset.mimeType === 'image/png';
      const format = isPNG ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG;
      const compressValue = isPNG ? 1 : 0.5;
      
      console.log('📄 Detected format:', format);
      
      const compressed = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: resizeOptions }],
        { compress: compressValue, format }
      );
      console.log('✅ Image compressed:', compressed.uri);
      return compressed;
    } catch (error) {
      console.error('⚠️ Compression failed, using original:', error);
      return asset;
    }
  },

  async uploadPhoto(asset: any, eventId: string, isSquare: boolean = false) {
    try {
      if (Platform.OS === 'web') {
        console.warn('Photo upload not fully supported on web');
        return 'https://via.placeholder.com/600x400?text=Event+Photo';
      }

      const compressedAsset = await this.compressImage(asset, isSquare);
      
      const isPNG = compressedAsset.uri.toLowerCase().includes('.png');
      const fileExtension = isPNG ? 'png' : 'jpg';
      const contentType = isPNG ? 'image/png' : 'image/jpeg';
      
      const filename = `${eventId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
      console.log('🔼 Starting photo upload with filename:', filename);
      console.log('📸 Asset URI:', compressedAsset.uri);
      console.log('📄 Content type:', contentType);

      console.log('📥 Reading image file as base64...');
      const fetchPromise = fetch(compressedAsset.uri);
      const response = await Promise.race([
        fetchPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Fetch timeout')), 10000)
        )
      ]) as Response;
      
      const blob = await response.blob();
      console.log('📦 Blob size:', blob.size, 'bytes');

      if (blob.size > 5 * 1024 * 1024) {
        throw new Error('Image too large (max 5MB). Please try a smaller image.');
      }

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Base64 conversion timeout'));
        }, 15000);

        reader.onload = () => {
          clearTimeout(timeout);
          const base64String = reader.result?.toString().split(',')[1];
          if (!base64String) {
            reject(new Error('Failed to extract base64 data'));
          } else {
            resolve(base64String);
          }
        };
        reader.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('FileReader error'));
        };
      });

      reader.readAsDataURL(blob);
      const base64Data = await base64Promise;

      console.log('✅ Base64 conversion successful, length:', base64Data.length);

      console.log('🚀 Uploading to Supabase bucket:', BUCKET_NAME);
      const uploadPromise = supabase.storage
        .from(BUCKET_NAME)
        .upload(filename, decode(base64Data), {
          contentType,
          cacheControl: '3600',
          upsert: false,
        });

      const uploadResult = await Promise.race([
        uploadPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout - please check your internet connection')), 30000)
        )
      ]) as any;

      const { data, error } = uploadResult;

      if (error) {
        console.error('❌ Supabase upload error:', error);
        throw new Error(`Upload failed: ${error.message || 'Unknown error'}`);
      }

      console.log('✅ Upload successful, server response:', data);

      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filename);

      const publicUrl = urlData.publicUrl;
      console.log('🌐 Public URL generated:', publicUrl);

      return publicUrl;
    } catch (error: any) {
      console.error('❌ CRITICAL ERROR uploading photo:', error.message || error);
      if (error.stack) {
        console.error('📋 Error stack:', error.stack);
      }
      throw new Error(error.message || 'Upload failed');
    }
  },

  async deletePhoto(photoUrl: string) {
    try {
      if (!photoUrl || !photoUrl.includes(BUCKET_NAME)) {
        return;
      }

      const urlParts = photoUrl.split(`${BUCKET_NAME}/`);
      if (urlParts.length < 2) {
        return;
      }

      const filePath = urlParts[1];
      console.log('🗑️ Deleting photo from Supabase:', filePath);

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error('❌ Error deleting photo from Supabase:', error);
        throw error;
      }

      console.log('✅ Photo deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting photo:', error);
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
