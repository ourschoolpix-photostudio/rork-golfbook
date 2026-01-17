import { Audio } from 'expo-av';
import { Platform } from 'react-native';

class SoundService {
  private bellSound: Audio.Sound | null = null;
  private emergencySound: Audio.Sound | null = null;
  private golfSwingSound: Audio.Sound | null = null;
  private isBellLoaded = false;
  private isEmergencyLoaded = false;
  private isGolfSwingLoaded = false;

  async loadBellSound() {
    if (this.isBellLoaded) return;

    try {
      console.log('[SoundService] Loading bell notification sound...');
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/bellNotify.mp3'),
        { shouldPlay: false }
      );
      this.bellSound = sound;
      this.isBellLoaded = true;
      console.log('[SoundService] Bell sound loaded successfully');
    } catch (error) {
      console.error('[SoundService] Failed to load bell sound:', error);
    }
  }

  async loadEmergencySound() {
    if (this.isEmergencyLoaded) return;

    try {
      console.log('[SoundService] Loading emergency sound...');
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/Emergency.mp3'),
        { shouldPlay: false }
      );
      this.emergencySound = sound;
      this.isEmergencyLoaded = true;
      console.log('[SoundService] Emergency sound loaded successfully');
    } catch (error) {
      console.error('[SoundService] Failed to load emergency sound:', error);
    }
  }

  async loadGolfSwingSound() {
    if (this.isGolfSwingLoaded) return;

    try {
      console.log('[SoundService] Loading golf swing sound...');
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/golfSwing.mp3'),
        { shouldPlay: false }
      );
      this.golfSwingSound = sound;
      this.isGolfSwingLoaded = true;
      console.log('[SoundService] Golf swing sound loaded successfully');
    } catch (error) {
      console.error('[SoundService] Failed to load golf swing sound:', error);
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

      if (!this.isBellLoaded) {
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

  async playEmergencySound() {
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

      if (!this.isEmergencyLoaded) {
        await this.loadEmergencySound();
      }

      if (this.emergencySound) {
        console.log('[SoundService] Playing emergency sound...');
        await this.emergencySound.replayAsync();
      }
    } catch (error) {
      console.error('[SoundService] Failed to play emergency sound:', error);
    }
  }

  async playGolfSwingSound() {
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

      if (!this.isGolfSwingLoaded) {
        await this.loadGolfSwingSound();
      }

      if (this.golfSwingSound) {
        console.log('[SoundService] Playing golf swing sound...');
        await this.golfSwingSound.replayAsync();
      }
    } catch (error) {
      console.error('[SoundService] Failed to play golf swing sound:', error);
    }
  }

  async unloadSound() {
    if (this.bellSound) {
      console.log('[SoundService] Unloading bell sound...');
      await this.bellSound.unloadAsync();
      this.bellSound = null;
      this.isBellLoaded = false;
    }
    if (this.emergencySound) {
      console.log('[SoundService] Unloading emergency sound...');
      await this.emergencySound.unloadAsync();
      this.emergencySound = null;
      this.isEmergencyLoaded = false;
    }
    if (this.golfSwingSound) {
      console.log('[SoundService] Unloading golf swing sound...');
      await this.golfSwingSound.unloadAsync();
      this.golfSwingSound = null;
      this.isGolfSwingLoaded = false;
    }
  }
}

export const soundService = new SoundService();
