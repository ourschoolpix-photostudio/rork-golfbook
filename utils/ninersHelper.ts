import { PersonalGamePlayer } from '@/types';

export type PlayerScoreData = {
  playerIndex: number;
  netScore: number;
};

export function calculateNinersPointsForHole(
  hole: number,
  game: any,
  holeScores: { [playerIndex: number]: { [hole: number]: number } },
  shouldPlayerReceiveStrokeOnHole: (player: PersonalGamePlayer, playerIndex: number, holeIndex: number) => boolean
): { [playerIndex: number]: number } {
  if (!game || game.players.length !== 3) return {};

  const allScoresEntered = game.players.every((_: PersonalGamePlayer, idx: number) => {
    if (idx < 0 || idx >= game.players.length) return false;
    const score = holeScores[idx]?.[hole];
    return score && score > 0;
  });

  if (!allScoresEntered) return {};

  const playerScoresForHole: PlayerScoreData[] = game.players.map((player: PersonalGamePlayer, idx: number) => {
    const grossScore = holeScores[idx]?.[hole] || 0;
    const receivesStroke = shouldPlayerReceiveStrokeOnHole(player, idx, hole - 1);
    const netScore = receivesStroke ? grossScore - 1 : grossScore;
    return { playerIndex: idx, netScore };
  });

  const sortedScores = [...playerScoresForHole].sort((a, b) => a.netScore - b.netScore);
  
  const firstPlace = sortedScores[0];
  const secondPlace = sortedScores[1];
  const thirdPlace = sortedScores[2];

  const allTied = firstPlace.netScore === secondPlace.netScore && secondPlace.netScore === thirdPlace.netScore;
  const topTwoTied = firstPlace.netScore === secondPlace.netScore && secondPlace.netScore < thirdPlace.netScore;
  const bottomTwoTied = firstPlace.netScore < secondPlace.netScore && secondPlace.netScore === thirdPlace.netScore;

  const points: { [playerIndex: number]: number } = {};

  if (allTied) {
    points[firstPlace.playerIndex] = 3;
    points[secondPlace.playerIndex] = 3;
    points[thirdPlace.playerIndex] = 3;
  } else if (topTwoTied) {
    points[firstPlace.playerIndex] = 4;
    points[secondPlace.playerIndex] = 4;
    points[thirdPlace.playerIndex] = 1;
  } else if (bottomTwoTied) {
    points[firstPlace.playerIndex] = 5;
    points[secondPlace.playerIndex] = 2;
    points[thirdPlace.playerIndex] = 2;
  } else {
    points[firstPlace.playerIndex] = 5;
    points[secondPlace.playerIndex] = 3;
    points[thirdPlace.playerIndex] = 1;
  }

  return points;
}

export function getTotalNinersPoints(
  playerIndex: number,
  game: any,
  holeScores: { [playerIndex: number]: { [hole: number]: number } },
  shouldPlayerReceiveStrokeOnHole: (player: PersonalGamePlayer, playerIndex: number, holeIndex: number) => boolean
): number {
  if (!game || playerIndex < 0 || playerIndex >= game.players.length) return 0;
  
  let totalPoints = 0;
  for (let hole = 1; hole <= 18; hole++) {
    const holePoints = calculateNinersPointsForHole(hole, game, holeScores, shouldPlayerReceiveStrokeOnHole);
    totalPoints += holePoints[playerIndex] || 0;
  }
  return totalPoints;
}

export function getHoleByHolePoints(
  playerIndex: number,
  game: any,
  holeScores: { [playerIndex: number]: { [hole: number]: number } },
  shouldPlayerReceiveStrokeOnHole: (player: PersonalGamePlayer, playerIndex: number, holeIndex: number) => boolean
): { [hole: number]: number } {
  if (!game || playerIndex < 0 || playerIndex >= game.players.length) return {};
  
  const pointsByHole: { [hole: number]: number } = {};
  for (let hole = 1; hole <= 18; hole++) {
    const holePoints = calculateNinersPointsForHole(hole, game, holeScores, shouldPlayerReceiveStrokeOnHole);
    if (holePoints[playerIndex]) {
      pointsByHole[hole] = holePoints[playerIndex];
    }
  }
  return pointsByHole;
}
