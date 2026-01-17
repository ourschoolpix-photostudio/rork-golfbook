import { Audio } from 'expo-av';
import { Platform } from 'react-native';

class SoundService {
  private bellSound: Audio.Sound | null = null;
  private isLoaded = false;

  async loadBellSound() {
    if (this.isLoaded) return;

    try {
      console.log('[SoundService] Loading bell notification sound...');
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/bellNotify.mp3'),
        { shouldPlay: false }
      );
      this.bellSound = sound;
      this.isLoaded = true;
      console.log('[SoundService] Bell sound loaded successfully');
    } catch (error) {
      console.error('[SoundService] Failed to load bell sound:', error);
    }
  }

  async playBellNotification() {
    try {
      if (Platform.OS === 'web') {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: false,
        });
      } else {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
      }

      if (!this.isLoaded) {
        await this.loadBellSound();
      }

      if (this.bellSound) {
        console.log('[SoundService] Playing bell notification...');
        await this.bellSound.replayAsync();
      }
    } catch (error) {
      console.error('[SoundService] Failed to play bell notification:', error);
    }
  }

  async unloadSound() {
    if (this.bellSound) {
      console.log('[SoundService] Unloading bell sound...');
      await this.bellSound.unloadAsync();
      this.bellSound = null;
      this.isLoaded = false;
    }
  }
}

export const soundService = new SoundService();
