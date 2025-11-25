export interface Member {
  id: string;
  name: string;
  pin: string;
  isAdmin: boolean;
  email?: string;
  phone?: string;
  handicap?: number;
  rolexPoints: number;
  createdAt: string;
  fullName?: string;
  username?: string;
  membershipType?: 'active' | 'in-active' | 'guest';
  gender?: 'male' | 'female';
  address?: string;
  city?: string;
  state?: string;
  flight?: 'A' | 'B' | 'C' | 'L';
  rolexFlight?: 'A' | 'B';
  currentHandicap?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  joinDate?: string;
  profilePhotoUrl?: string;
  adjustedHandicap?: string;
  ghin?: string;
  profilePhotoUri?: string;
  scoreTotal?: number;
  scoreNet?: number;
  effectiveHandicap?: number;
  registration?: any;
  boardMemberRoles?: string[];
}

export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
}

export interface Event {
  id: string;
  name: string;
  eventName?: string;
  date: string;
  startDate?: string;
  endDate?: string;
  venue: string;
  location?: string;
  course?: string;
  status: 'draft' | 'active' | 'completed' | 'upcoming' | 'complete';
  description?: string;
  memo?: string;
  registrationDeadline?: string;
  maxParticipants?: number;
  createdAt: string;
  createdBy?: string;
  type?: 'tournament' | 'social';
  photoUrl?: string;
  entryFee?: string;
  numberOfDays?: 1 | 2 | 3;
  players?: string[];
  registeredPlayers?: string[];
  address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  day1StartTime?: string;
  day1StartPeriod?: 'AM' | 'PM';
  day1EndTime?: string;
  day1EndPeriod?: 'AM' | 'PM';
  day1Course?: string;
  day1StartType?: 'tee-time' | 'shotgun';
  day1LeadingHole?: string;
  day1Par?: string;
  day1HolePars?: string[];
  day1SlopeRating?: string;
  day1CourseRating?: string;
  day2StartTime?: string;
  day2StartPeriod?: 'AM' | 'PM';
  day2EndTime?: string;
  day2EndPeriod?: 'AM' | 'PM';
  day2Course?: string;
  day2StartType?: 'tee-time' | 'shotgun';
  day2LeadingHole?: string;
  day2Par?: string;
  day2HolePars?: string[];
  day2SlopeRating?: string;
  day2CourseRating?: string;
  day3StartTime?: string;
  day3StartPeriod?: 'AM' | 'PM';
  day3EndTime?: string;
  day3EndPeriod?: 'AM' | 'PM';
  day3Course?: string;
  day3StartType?: 'tee-time' | 'shotgun';
  day3LeadingHole?: string;
  day3Par?: string;
  day3HolePars?: string[];
  day3SlopeRating?: string;
  day3CourseRating?: string;
  holePars?: string[];
  flightACutoff?: string;
  flightBCutoff?: string;
  flightATeebox?: string;
  flightBTeebox?: string;
  flightLTeebox?: string;
  flightATrophy1st?: boolean;
  flightATrophy2nd?: boolean;
  flightATrophy3rd?: boolean;
  flightBTrophy1st?: boolean;
  flightBTrophy2nd?: boolean;
  flightBTrophy3rd?: boolean;
  flightCTrophy1st?: boolean;
  flightCTrophy2nd?: boolean;
  flightCTrophy3rd?: boolean;
  flightLTrophy1st?: boolean;
  flightLTrophy2nd?: boolean;
  flightLTrophy3rd?: boolean;
  flightACashPrize1st?: string;
  flightACashPrize2nd?: string;
  flightACashPrize3rd?: string;
  flightBCashPrize1st?: string;
  flightBCashPrize2nd?: string;
  flightBCashPrize3rd?: string;
  flightCCashPrize1st?: string;
  flightCCashPrize2nd?: string;
  flightCCashPrize3rd?: string;
  flightLCashPrize1st?: string;
  flightLCashPrize2nd?: string;
  flightLCashPrize3rd?: string;
  lowGrossTrophy?: boolean;
  lowGrossCashPrize?: string;
  closestToPin?: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  memberId: string;
  registeredAt: string;
  status: 'registered' | 'confirmed' | 'withdrawn';
  paymentStatus?: 'pending' | 'paid' | 'refunded';
}

export interface Grouping {
  day: number;
  hole: number;
  slots: (string | null)[];
}

export interface Score {
  id: string;
  eventId: string;
  memberId: string;
  holes: number[];
  totalScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventRolexPoints {
  eventId: string;
  memberId: string;
  points: number;
  position: number;
}

export interface FinancialRecord {
  id: string;
  eventId: string;
  memberId?: string;
  type: 'registration' | 'prize' | 'expense' | 'income' | 'other';
  amount: number;
  description: string;
  date: string;
}

export interface PersonalGamePlayer {
  name: string;
  handicap: number;
  scores: number[];
  totalScore: number;
  strokesReceived?: number;
  teamId?: 1 | 2;
  strokesUsed?: number[];
  strokeMode?: 'manual' | 'auto' | 'all-but-par3';
  wolfPoints?: number;
}

export interface PersonalGame {
  id: string;
  courseName: string;
  coursePar: number;
  holePars: number[];
  strokeIndices?: number[];
  players: PersonalGamePlayer[];
  createdAt: string;
  completedAt?: string;
  status: 'in-progress' | 'completed';
  gameType?: 'individual-net' | 'team-match-play' | 'wolf' | 'niners';
  matchPlayScoringType?: 'best-ball' | 'alternate-ball';
  teamScores?: { team1: number; team2: number };
  holeResults?: ('team1' | 'team2' | 'tie')[];
  wolfOrder?: number[];
  wolfPartnerships?: { [hole: number]: { wolfPlayerIndex: number; partnerPlayerIndex: number | null; isLoneWolf: boolean } };
}

export interface RegistrationNotification {
  id: string;
  memberId?: string;
  eventId?: string;
  type: 'registration' | 'cancellation' | 'update' | 'payment' | 'general';
  title: string;
  message: string;
  isRead: boolean;
  metadata?: any;
  createdAt: string;
}

export interface Course {
  id: string;
  name: string;
  par: number;
  holePars: number[];
  strokeIndices?: number[];
  memberId?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}
