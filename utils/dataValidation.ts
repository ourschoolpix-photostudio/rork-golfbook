export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateMemberData(member: any): ValidationResult {
  const errors: string[] = [];

  if (!member.name || typeof member.name !== 'string' || member.name.trim().length === 0) {
    errors.push('Member name is required and must be a non-empty string');
  }

  if (!member.pin || typeof member.pin !== 'string' || member.pin.length < 4) {
    errors.push('PIN is required and must be at least 4 characters');
  }

  if (member.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
    errors.push('Invalid email format');
  }

  if (member.phone && !/^\+?[\d\s\-\(\)]+$/.test(member.phone)) {
    errors.push('Invalid phone number format');
  }

  if (member.handicap !== undefined && (typeof member.handicap !== 'number' || member.handicap < 0 || member.handicap > 54)) {
    errors.push('Handicap must be a number between 0 and 54');
  }

  if (member.membershipType && !['active', 'in-active', 'guest'].includes(member.membershipType)) {
    errors.push('Invalid membership type. Must be active, in-active, or guest');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateEventData(event: any): ValidationResult {
  const errors: string[] = [];

  if (!event.name || typeof event.name !== 'string' || event.name.trim().length === 0) {
    errors.push('Event name is required and must be a non-empty string');
  }

  if (!event.venue || typeof event.venue !== 'string' || event.venue.trim().length === 0) {
    errors.push('Venue is required and must be a non-empty string');
  }

  if (!event.date) {
    errors.push('Event date is required');
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(event.date)) {
      errors.push('Event date must be in YYYY-MM-DD format');
    }
  }

  if (event.status && !['draft', 'active', 'completed', 'upcoming', 'complete'].includes(event.status)) {
    errors.push('Invalid event status');
  }

  if (event.type && !['tournament', 'social'].includes(event.type)) {
    errors.push('Event type must be tournament or social');
  }

  if (event.numberOfDays && ![1, 2, 3].includes(event.numberOfDays)) {
    errors.push('Number of days must be 1, 2, or 3');
  }

  if (event.entryFee && (isNaN(Number(event.entryFee)) || Number(event.entryFee) < 0)) {
    errors.push('Entry fee must be a non-negative number');
  }

  if (event.maxParticipants && (typeof event.maxParticipants !== 'number' || event.maxParticipants <= 0)) {
    errors.push('Max participants must be a positive number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateRegistrationData(registration: any): ValidationResult {
  const errors: string[] = [];

  if (!registration.eventId || typeof registration.eventId !== 'string') {
    errors.push('Event ID is required and must be a string');
  }

  if (!registration.memberId || typeof registration.memberId !== 'string') {
    errors.push('Member ID is required and must be a string');
  }

  if (registration.status && !['registered', 'confirmed', 'withdrawn'].includes(registration.status)) {
    errors.push('Invalid registration status');
  }

  if (registration.paymentStatus && !['pending', 'paid', 'refunded'].includes(registration.paymentStatus)) {
    errors.push('Invalid payment status');
  }

  if (registration.numberOfGuests !== undefined && (typeof registration.numberOfGuests !== 'number' || registration.numberOfGuests < 0)) {
    errors.push('Number of guests must be a non-negative number');
  }

  if (registration.adjustedHandicap !== undefined && registration.adjustedHandicap !== null) {
    const handicap = Number(registration.adjustedHandicap);
    if (isNaN(handicap) || handicap < 0 || handicap > 54) {
      errors.push('Adjusted handicap must be a number between 0 and 54');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateScoreData(score: any): ValidationResult {
  const errors: string[] = [];

  if (!score.eventId || typeof score.eventId !== 'string') {
    errors.push('Event ID is required and must be a string');
  }

  if (!score.memberId || typeof score.memberId !== 'string') {
    errors.push('Member ID is required and must be a string');
  }

  if (!score.day || typeof score.day !== 'number' || score.day < 1 || score.day > 3) {
    errors.push('Day must be a number between 1 and 3');
  }

  if (!score.holes || !Array.isArray(score.holes)) {
    errors.push('Holes must be an array');
  } else {
    if (score.holes.length !== 18) {
      errors.push('Holes array must contain exactly 18 elements');
    }

    score.holes.forEach((hole: any, index: number) => {
      if (hole !== null && (typeof hole !== 'number' || hole < 1 || hole > 15)) {
        errors.push(`Hole ${index + 1}: Score must be between 1 and 15 or null`);
      }
    });
  }

  if (score.totalScore !== undefined && score.totalScore !== null) {
    if (typeof score.totalScore !== 'number' || score.totalScore < 18 || score.totalScore > 270) {
      errors.push('Total score must be a number between 18 and 270');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateGroupingData(grouping: any): ValidationResult {
  const errors: string[] = [];

  if (!grouping.eventId || typeof grouping.eventId !== 'string') {
    errors.push('Event ID is required and must be a string');
  }

  if (!grouping.day || typeof grouping.day !== 'number' || grouping.day < 1 || grouping.day > 3) {
    errors.push('Day must be a number between 1 and 3');
  }

  if (!grouping.hole || typeof grouping.hole !== 'number' || grouping.hole < 1 || grouping.hole > 18) {
    errors.push('Hole must be a number between 1 and 18');
  }

  if (!grouping.slots || !Array.isArray(grouping.slots)) {
    errors.push('Slots must be an array');
  } else {
    if (grouping.slots.length !== 4) {
      errors.push('Slots array must contain exactly 4 elements');
    }

    grouping.slots.forEach((slot: any, index: number) => {
      if (slot !== null && typeof slot !== 'string') {
        errors.push(`Slot ${index + 1}: Must be a string (member ID) or null`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateFinancialData(financial: any): ValidationResult {
  const errors: string[] = [];

  if (!financial.eventId || typeof financial.eventId !== 'string') {
    errors.push('Event ID is required and must be a string');
  }

  if (!financial.type || !['registration', 'prize', 'expense', 'income', 'other'].includes(financial.type)) {
    errors.push('Invalid financial transaction type');
  }

  if (financial.amount === undefined || financial.amount === null) {
    errors.push('Amount is required');
  } else if (typeof financial.amount !== 'number') {
    errors.push('Amount must be a number');
  }

  if (!financial.description || typeof financial.description !== 'string' || financial.description.trim().length === 0) {
    errors.push('Description is required and must be a non-empty string');
  }

  if (!financial.date) {
    errors.push('Date is required');
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(financial.date)) {
      errors.push('Date must be in YYYY-MM-DD format');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
