import { storageService } from '@/utils/storage';

export interface Registration {
  id: string;
  eventId: string;
  playerName: string;
  playerPhone: string | null;
  paymentMethod: 'zelle' | 'paypal';
  paymentStatus: 'paid' | 'unpaid';
  createdAt: string;
  adjustedHandicap?: string;
  isCustomGuest?: boolean;
  numberOfGuests?: number;
}

export const registrationService = {
  async createRegistration(
    eventId: string,
    playerName: string,
    playerPhone: string | null,
    paymentMethod: 'zelle' | 'paypal',
    isCustomGuest?: boolean,
    numberOfGuests?: number
  ) {
    console.log('[registrationService] Creating registration for:', playerName, 'eventId:', eventId);

    const newRegistration: Registration = {
      id: `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventId,
      playerName,
      playerPhone,
      paymentMethod,
      paymentStatus: paymentMethod === 'paypal' ? 'paid' : 'unpaid',
      createdAt: new Date().toISOString(),
      isCustomGuest,
      numberOfGuests,
    };

    await storageService.addRegistration(newRegistration);
    console.log('[registrationService] Registration created successfully:', newRegistration);
    return newRegistration;
  },

  async getRegistrationsForEvent(eventId: string) {
    const registrations = await storageService.getRegistrations();
    return registrations.filter(r => r.eventId === eventId);
  },

  async updatePaymentStatus(registrationId: string, status: 'paid' | 'unpaid') {
    const registration = await storageService.updateRegistration(registrationId, { paymentStatus: status });
    return registration;
  },

  async updateAdjustedHandicap(registrationId: string, adjustedHandicap: string | undefined) {
    const registration = await storageService.updateRegistration(registrationId, { adjustedHandicap });
    return registration;
  },

  async updateGuestCount(registrationId: string, numberOfGuests: number | undefined) {
    const registration = await storageService.updateRegistration(registrationId, { numberOfGuests });
    return registration;
  },

  async deleteRegistration(registrationId: string) {
    await storageService.deleteRegistration(registrationId);
  },
};
