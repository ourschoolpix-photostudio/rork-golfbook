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

  const transactions: Transaction[] = [];

  for (let i = 0; i < playerPayments.length; i++) {
    for (let j = i + 1; j < playerPayments.length; j++) {
      const diff = playerPayments[i].dollarAmount - playerPayments[j].dollarAmount;
      if (Math.abs(diff) > 0.01) {
        if (diff > 0) {
          transactions.push({
            from: playerPayments[j].name,
            to: playerPayments[i].name,
            amount: Math.round(diff * 100) / 100
          });
        } else {
          transactions.push({
            from: playerPayments[i].name,
            to: playerPayments[j].name,
            amount: Math.round(Math.abs(diff) * 100) / 100
          });
        }
      }
    }
  }

  const simplifiedTransactions = simplifyTransactions(transactions);

  return { playerPayments, transactions: simplifiedTransactions };
}

function simplifyTransactions(transactions: Transaction[]): Transaction[] {
  const balances: { [name: string]: number } = {};

  transactions.forEach(t => {
    if (!balances[t.from]) balances[t.from] = 0;
    if (!balances[t.to]) balances[t.to] = 0;
    balances[t.from] -= t.amount;
    balances[t.to] += t.amount;
  });

  const creditors = Object.entries(balances)
    .filter(([_, balance]) => balance > 0.01)
    .sort((a, b) => b[1] - a[1])
    .map(([name, balance]) => ({ name, balance }));

  const debtors = Object.entries(balances)
    .filter(([_, balance]) => balance < -0.01)
    .sort((a, b) => a[1] - b[1])
    .map(([name, balance]) => ({ name, balance: -balance }));

  const simplified: Transaction[] = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const amount = Math.min(creditor.balance, debtor.balance);

    if (amount > 0.01) {
      simplified.push({
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(amount * 100) / 100
      });
    }

    creditor.balance -= amount;
    debtor.balance -= amount;

    if (creditor.balance < 0.01) i++;
    if (debtor.balance < 0.01) j++;
  }

  return simplified;
}
