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
      console.log('[SoundService] Failed to initialize audio mode (non-critical):', error);
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
      console.log('[SoundService] Failed to load bell sound (non-critical):', error?.message || error);
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
      console.log('[SoundService] Failed to load emergency sound (non-critical):', error?.message || error);
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
      
      if (this.isMediaCorruptedError(errorMessage)) {
        console.log('[SoundService] Golf swing sound file appears corrupted or unsupported - sound will be disabled');
      } else {
        console.log('[SoundService] Failed to load golf swing sound:', errorMessage);
      }
      return false;
    }
  }

  private isMediaCorruptedError(errorMessage: string): boolean {
    return (
      errorMessage.includes('media may be damaged') ||
      errorMessage.includes('-11849') ||
      errorMessage.includes('-11850') ||
      errorMessage.includes('AVFoundationErrorDomain') ||
      errorMessage.includes('could not be decoded') ||
      errorMessage.includes('format not recognized') ||
      errorMessage.includes('unsupported format')
    );
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
    if (this.golfSwingLoadFailed) {
      return false;
    }

    try {
      const audioInitialized = await this.initAudioMode();
      if (!audioInitialized) {
        return false;
      }

      if (!this.isGolfSwingLoaded) {
        const loaded = await this.loadGolfSwingSound();
        if (!loaded) {
          return false;
        }
      }

      if (this.golfSwingSound) {
        await this.golfSwingSound.setPositionAsync(0);
        await this.golfSwingSound.playAsync();
        return true;
      }
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
      console.log(`[SoundService] Sound file not found for ${soundName} (non-critical)`);
      return;
    }
    
    if (errorMessage.includes('Player does not exist') ||
        errorMessage.includes('AV not available') ||
        errorMessage.includes('Audio not available')) {
      console.log(`[SoundService] Audio system not available for ${soundName} (non-critical)`);
      return;
    }
    
    console.log(`[SoundService] Failed to play ${soundName} (non-critical):`, errorMessage);
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
      console.log('[SoundService] Error unloading bell sound (non-critical):', error);
    }
    
    try {
      if (this.emergencySound) {
        console.log('[SoundService] Unloading emergency sound...');
        await this.emergencySound.unloadAsync();
        this.emergencySound = null;
        this.isEmergencyLoaded = false;
      }
    } catch (error) {
      console.log('[SoundService] Error unloading emergency sound (non-critical):', error);
    }
    
    try {
      if (this.golfSwingSound) {
        console.log('[SoundService] Unloading golf swing sound...');
        await this.golfSwingSound.unloadAsync();
        this.golfSwingSound = null;
        this.isGolfSwingLoaded = false;
      }
    } catch (error) {
      console.log('[SoundService] Error unloading golf swing sound (non-critical):', error);
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
