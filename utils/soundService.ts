import { Audio } from 'expo-av';
import { Platform } from 'react-native';

class SoundService {
  private bellSound: Audio.Sound | null = null;
  private emergencySound: Audio.Sound | null = null;
  private golfSwingSound: Audio.Sound | null = null;
  private isBellLoaded = false;
  private isEmergencyLoaded = false;
  private isGolfSwingLoaded = false;
  private bellLoadFailed = false;
  private emergencyLoadFailed = false;
  private golfSwingLoadFailed = false;
  private isInitialized = false;

  private async initAudioMode(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: Platform.OS !== 'web',
        staysActiveInBackground: false,
      });
      this.isInitialized = true;
      console.log('[SoundService] Audio mode initialized');
      return true;
    } catch (error) {
      console.warn('[SoundService] Failed to initialize audio mode:', error);
      return false;
    }
  }

  async loadBellSound(): Promise<boolean> {
    if (this.isBellLoaded) return true;
    if (this.bellLoadFailed) return false;

    try {
      console.log('[SoundService] Loading bell notification sound...');
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/bellNotify.mp3'),
        { shouldPlay: false }
      );
      this.bellSound = sound;
      this.isBellLoaded = true;
      console.log('[SoundService] Bell sound loaded successfully');
      return true;
    } catch (error: any) {
      this.bellLoadFailed = true;
      console.warn('[SoundService] Failed to load bell sound:', error?.message || error);
      return false;
    }
  }

  async loadEmergencySound(): Promise<boolean> {
    if (this.isEmergencyLoaded) return true;
    if (this.emergencyLoadFailed) return false;

    try {
      console.log('[SoundService] Loading emergency sound...');
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/Emergency.mp3'),
        { shouldPlay: false }
      );
      this.emergencySound = sound;
      this.isEmergencyLoaded = true;
      console.log('[SoundService] Emergency sound loaded successfully');
      return true;
    } catch (error: any) {
      this.emergencyLoadFailed = true;
      console.warn('[SoundService] Failed to load emergency sound:', error?.message || error);
      return false;
    }
  }

  async loadGolfSwingSound(): Promise<boolean> {
    if (this.isGolfSwingLoaded) return true;
    if (this.golfSwingLoadFailed) return false;

    try {
      console.log('[SoundService] Loading golf swing sound...');
      console.log('[SoundService] Platform:', Platform.OS);
      
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/golfSwing.mp3'),
        { shouldPlay: false }
      );
      this.golfSwingSound = sound;
      this.isGolfSwingLoaded = true;
      console.log('[SoundService] Golf swing sound loaded successfully');
      return true;
    } catch (error: any) {
      this.golfSwingLoadFailed = true;
      const errorMessage = error?.message || String(error);
      const errorName = error?.name || 'Unknown';
      console.warn('[SoundService] Failed to load golf swing sound:');
      console.warn('[SoundService]   - Error name:', errorName);
      console.warn('[SoundService]   - Error message:', errorMessage);
      console.warn('[SoundService]   - Full error:', JSON.stringify(error, null, 2));
      return false;
    }
  }

  async playBellNotification(): Promise<boolean> {
    try {
      await this.initAudioMode();

      if (!this.isBellLoaded && !this.bellLoadFailed) {
        const loaded = await this.loadBellSound();
        if (!loaded) {
          console.log('[SoundService] Bell sound not available, skipping playback');
          return false;
        }
      }

      if (this.bellSound) {
        console.log('[SoundService] Playing bell notification...');
        await this.bellSound.setPositionAsync(0);
        await this.bellSound.playAsync();
        return true;
      }
      return false;
    } catch (error: any) {
      this.handlePlaybackError('bell notification', error);
      return false;
    }
  }

  async playEmergencySound(): Promise<boolean> {
    try {
      await this.initAudioMode();

      if (!this.isEmergencyLoaded && !this.emergencyLoadFailed) {
        const loaded = await this.loadEmergencySound();
        if (!loaded) {
          console.log('[SoundService] Emergency sound not available, skipping playback');
          return false;
        }
      }

      if (this.emergencySound) {
        console.log('[SoundService] Playing emergency sound...');
        await this.emergencySound.setPositionAsync(0);
        await this.emergencySound.playAsync();
        return true;
      }
      return false;
    } catch (error: any) {
      this.handlePlaybackError('emergency sound', error);
      return false;
    }
  }

  async playGolfSwingSound(): Promise<boolean> {
    try {
      console.log('[SoundService] Attempting to play golf swing sound...');
      console.log('[SoundService] Platform:', Platform.OS);
      console.log('[SoundService] Golf swing loaded:', this.isGolfSwingLoaded);
      console.log('[SoundService] Golf swing load failed:', this.golfSwingLoadFailed);
      
      const audioInitialized = await this.initAudioMode();
      if (!audioInitialized) {
        console.warn('[SoundService] Audio mode initialization failed, skipping golf swing sound');
        return false;
      }

      if (!this.isGolfSwingLoaded && !this.golfSwingLoadFailed) {
        console.log('[SoundService] Golf swing sound not loaded, attempting to load...');
        const loaded = await this.loadGolfSwingSound();
        if (!loaded) {
          console.log('[SoundService] Golf swing sound not available, skipping playback');
          return false;
        }
      }

      if (this.golfSwingSound) {
        console.log('[SoundService] Playing golf swing sound...');
        const status = await this.golfSwingSound.getStatusAsync();
        console.log('[SoundService] Sound status before play:', JSON.stringify(status));
        await this.golfSwingSound.setPositionAsync(0);
        await this.golfSwingSound.playAsync();
        console.log('[SoundService] Golf swing sound playback initiated');
        return true;
      }
      console.warn('[SoundService] Golf swing sound object is null');
      return false;
    } catch (error: any) {
      this.handlePlaybackError('golf swing sound', error);
      return false;
    }
  }

  private handlePlaybackError(soundName: string, error: any): void {
    const errorMessage = error?.message || String(error);
    const errorName = error?.name || 'Unknown';
    const errorCode = error?.code || 'N/A';
    
    console.log(`[SoundService] Error details for ${soundName}:`);
    console.log(`[SoundService]   - Name: ${errorName}`);
    console.log(`[SoundService]   - Code: ${errorCode}`);
    console.log(`[SoundService]   - Message: ${errorMessage}`);
    console.log(`[SoundService]   - Platform: ${Platform.OS}`);
    
    if (Platform.OS === 'web') {
      if (errorMessage.includes('user didn\'t interact') || 
          errorMessage.includes('play() request was interrupted') ||
          errorMessage.includes('NotAllowedError') ||
          errorMessage.includes('not allowed by the user agent') ||
          errorMessage.includes('play() failed because') ||
          errorName === 'NotAllowedError') {
        console.log(`[SoundService] Audio autoplay blocked for ${soundName} - user interaction required (this is normal on web)`);
        return;
      }
    }
    
    if (errorMessage.includes('ENOENT') || 
        errorMessage.includes('not found') ||
        errorMessage.includes('Unable to resolve') ||
        errorMessage.includes('Cannot find module')) {
      console.warn(`[SoundService] Sound file not found for ${soundName}`);
      return;
    }
    
    if (errorMessage.includes('Player does not exist') ||
        errorMessage.includes('AV not available') ||
        errorMessage.includes('Audio not available')) {
      console.warn(`[SoundService] Audio system not available for ${soundName}`);
      return;
    }
    
    console.warn(`[SoundService] Failed to play ${soundName}:`, errorMessage);
  }

  async unloadSound(): Promise<void> {
    try {
      if (this.bellSound) {
        console.log('[SoundService] Unloading bell sound...');
        await this.bellSound.unloadAsync();
        this.bellSound = null;
        this.isBellLoaded = false;
      }
    } catch (error) {
      console.warn('[SoundService] Error unloading bell sound:', error);
    }
    
    try {
      if (this.emergencySound) {
        console.log('[SoundService] Unloading emergency sound...');
        await this.emergencySound.unloadAsync();
        this.emergencySound = null;
        this.isEmergencyLoaded = false;
      }
    } catch (error) {
      console.warn('[SoundService] Error unloading emergency sound:', error);
    }
    
    try {
      if (this.golfSwingSound) {
        console.log('[SoundService] Unloading golf swing sound...');
        await this.golfSwingSound.unloadAsync();
        this.golfSwingSound = null;
        this.isGolfSwingLoaded = false;
      }
    } catch (error) {
      console.warn('[SoundService] Error unloading golf swing sound:', error);
    }
  }

  resetLoadFailures(): void {
    this.bellLoadFailed = false;
    this.emergencyLoadFailed = false;
    this.golfSwingLoadFailed = false;
    console.log('[SoundService] Load failure flags reset');
  }

  getStatus(): { bell: boolean; emergency: boolean; golfSwing: boolean } {
    return {
      bell: this.isBellLoaded,
      emergency: this.isEmergencyLoaded,
      golfSwing: this.isGolfSwingLoaded,
    };
  }
}

export const soundService = new SoundService();
