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

type PlayerPayment = { name: string; points: number; dollarAmount: number; index: number };
type Transaction = { from: string; to: string; amount: number };
type Balance = { name: string; balance: number; index: number };

export function calculatePayments(game: any): {
  playerPayments: PlayerPayment[];
  transactions: Transaction[];
} | null {
  if (!game || game.gameType !== 'niners' || !game.dollarAmount) return null;

  const dollarPerPoint = game.dollarAmount;
  const playerPayments = game.players.map((player: PersonalGamePlayer, idx: number) => {
    const points = player.wolfPoints || 0;
    const dollarAmount = points * dollarPerPoint;
    return { name: player.name, points, dollarAmount, index: idx };
  });

  const totalPayout = playerPayments.reduce((sum: number, p: PlayerPayment) => sum + p.dollarAmount, 0);
  const avgPayout = totalPayout / playerPayments.length;

  const balances = playerPayments.map((p: PlayerPayment): Balance => ({
    name: p.name,
    balance: p.dollarAmount - avgPayout,
    index: p.index
  }));

  const creditors = balances.filter((b: Balance) => b.balance > 0).sort((a: Balance, b: Balance) => b.balance - a.balance);
  const debtors = balances.filter((b: Balance) => b.balance < 0).sort((a: Balance, b: Balance) => a.balance - b.balance);

  const transactions: Transaction[] = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const amount = Math.min(creditor.balance, Math.abs(debtor.balance));

    if (amount > 0.01) {
      transactions.push({
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(amount * 100) / 100
      });
    }

    creditor.balance -= amount;
    debtor.balance += amount;

    if (Math.abs(creditor.balance) < 0.01) i++;
    if (Math.abs(debtor.balance) < 0.01) j++;
  }

  return { playerPayments, transactions };
}
