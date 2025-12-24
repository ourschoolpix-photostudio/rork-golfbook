export interface TournamentHandicapRecord {
  eventId: string;
  eventName: string;
  score: number;
  par: number;
  handicap: number;
  date: string;
}

export function calculateTournamentHandicap(score: number, par: number, numberOfDays: number = 1): number {
  const totalDifference = score - par;
  return totalDifference / numberOfDays;
}

export function calculateAverageTournamentHandicap(
  records: TournamentHandicapRecord[]
): number {
  if (!records || records.length === 0) {
    return 0;
  }

  const totalHandicap = records.reduce((sum, record) => sum + record.handicap, 0);
  return Math.round((totalHandicap / records.length) * 10) / 10;
}

export function getTournamentHandicapDisplay(
  records: TournamentHandicapRecord[]
): string {
  if (!records || records.length === 0) {
    return 'N/A';
  }

  const validRecords = records.filter(r => r && r.eventId && r.handicap !== undefined);
  
  if (validRecords.length === 0) {
    return 'N/A';
  }

  const average = calculateAverageTournamentHandicap(validRecords);
  return `${average.toFixed(1)} (${validRecords.length} events)`;
}

export function addTournamentHandicapRecord(
  existingRecords: TournamentHandicapRecord[],
  newRecord: TournamentHandicapRecord
): TournamentHandicapRecord[] {
  const filteredRecords = existingRecords.filter(
    (record) => record.eventId !== newRecord.eventId
  );

  return [...filteredRecords, newRecord];
}
