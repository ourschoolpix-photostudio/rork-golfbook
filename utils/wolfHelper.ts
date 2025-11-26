import { PersonalGamePlayer } from '@/types';

export type WolfPartnership = {
  wolfPlayerIndex: number;
  partnerPlayerIndex: number | null;
  isLoneWolf: boolean;
  isQuad?: boolean;
};

export type PlayerScoreData = {
  playerIndex: number;
  netScore: number;
};

export function calculateWolfPointsForHole(
  hole: number,
  game: any,
  holeScores: { [playerIndex: number]: { [hole: number]: number } },
  shouldPlayerReceiveStrokeOnHole: (player: PersonalGamePlayer, playerIndex: number, holeIndex: number) => boolean
): { [playerIndex: number]: number } {
  if (!game || !game.wolfPartnerships) return {};

  const partnership = game.wolfPartnerships[hole.toString()];
  if (!partnership) return {};

  const wolfPlayerIndex = partnership.wolfPlayerIndex;
  const partnerPlayerIndex = partnership.partnerPlayerIndex;
  const isLoneWolfGame = partnership.isLoneWolf;
  const isQuadHole = partnership.isQuad || false;

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

  if (isLoneWolfGame) {
    return calculateLoneWolfPoints(wolfPlayerIndex, playerScoresForHole, isQuadHole);
  } else if (partnerPlayerIndex !== null) {
    return calculatePartnershipPoints(wolfPlayerIndex, partnerPlayerIndex, playerScoresForHole, isQuadHole);
  }

  return {};
}

function calculateLoneWolfPoints(
  wolfPlayerIndex: number,
  playerScoresForHole: PlayerScoreData[],
  isQuadHole: boolean
): { [playerIndex: number]: number } {
  const wolfScore = playerScoresForHole.find((p: PlayerScoreData) => p.playerIndex === wolfPlayerIndex)?.netScore || 999;
  const othersScores = playerScoresForHole
    .filter((p: PlayerScoreData) => p.playerIndex !== wolfPlayerIndex)
    .map((p: PlayerScoreData) => p.netScore);

  if (othersScores.length === 0) return {};
  
  const bestOtherScore = Math.min(...othersScores);

  if (wolfScore < bestOtherScore) {
    const wolfPoints = isQuadHole ? 16 : 4;
    return { [wolfPlayerIndex]: wolfPoints };
  } else if (wolfScore > bestOtherScore) {
    const points: { [playerIndex: number]: number } = {};
    const otherPoints = isQuadHole ? 4 : 2;
    playerScoresForHole
      .filter((p: PlayerScoreData) => p.playerIndex !== wolfPlayerIndex)
      .forEach((p: PlayerScoreData) => {
        points[p.playerIndex] = otherPoints;
      });
    return points;
  }
  return {};
}

function calculatePartnershipPoints(
  wolfPlayerIndex: number,
  partnerPlayerIndex: number,
  playerScoresForHole: PlayerScoreData[],
  isQuadHole: boolean
): { [playerIndex: number]: number } {
  const wolfTeamScores = playerScoresForHole
    .filter((p: PlayerScoreData) => p.playerIndex === wolfPlayerIndex || p.playerIndex === partnerPlayerIndex)
    .map((p: PlayerScoreData) => p.netScore);
  
  const othersScores = playerScoresForHole
    .filter((p: PlayerScoreData) => p.playerIndex !== wolfPlayerIndex && p.playerIndex !== partnerPlayerIndex)
    .map((p: PlayerScoreData) => p.netScore);

  if (wolfTeamScores.length === 0 || othersScores.length === 0) return {};

  const wolfTeamBest = Math.min(...wolfTeamScores);
  const othersBest = Math.min(...othersScores);

  if (wolfTeamBest < othersBest) {
    const teamPoints = isQuadHole ? 8 : 1;
    return { [wolfPlayerIndex]: teamPoints, [partnerPlayerIndex]: teamPoints };
  } else if (wolfTeamBest > othersBest) {
    const points: { [playerIndex: number]: number } = {};
    const otherPoints = isQuadHole ? 4 : 1;
    playerScoresForHole
      .filter((p: PlayerScoreData) => p.playerIndex !== wolfPlayerIndex && p.playerIndex !== partnerPlayerIndex)
      .forEach((p: PlayerScoreData) => {
        points[p.playerIndex] = otherPoints;
      });
    return points;
  }
  return {};
}

export function getTotalWolfPoints(
  playerIndex: number,
  game: any,
  holeScores: { [playerIndex: number]: { [hole: number]: number } },
  shouldPlayerReceiveStrokeOnHole: (player: PersonalGamePlayer, playerIndex: number, holeIndex: number) => boolean
): number {
  if (!game || playerIndex < 0 || playerIndex >= game.players.length) return 0;
  
  let totalPoints = 0;
  for (let hole = 1; hole <= 18; hole++) {
    const holePoints = calculateWolfPointsForHole(hole, game, holeScores, shouldPlayerReceiveStrokeOnHole);
    totalPoints += holePoints[playerIndex] || 0;
  }
  return totalPoints;
}

type PlayerPayment = { name: string; points: number; dollarAmount: number; index: number };
type Transaction = { from: string; to: string; amount: number };

export function calculatePayments(game: any): {
  playerPayments: PlayerPayment[];
  transactions: Transaction[];
} | null {
  if (!game || game.gameType !== 'wolf' || !game.dollarAmount) return null;

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

export function getHoleByHolePoints(
  playerIndex: number,
  game: any,
  holeScores: { [playerIndex: number]: { [hole: number]: number } },
  shouldPlayerReceiveStrokeOnHole: (player: PersonalGamePlayer, playerIndex: number, holeIndex: number) => boolean
): { [hole: number]: number } {
  if (!game || playerIndex < 0 || playerIndex >= game.players.length) return {};
  
  const pointsByHole: { [hole: number]: number } = {};
  for (let hole = 1; hole <= 18; hole++) {
    const holePoints = calculateWolfPointsForHole(hole, game, holeScores, shouldPlayerReceiveStrokeOnHole);
    if (holePoints[playerIndex]) {
      pointsByHole[hole] = holePoints[playerIndex];
    }
  }
  return pointsByHole;
}

export function determineCurrentWolf(
  currentHole: number,
  game: any,
  holeScores: { [playerIndex: number]: { [hole: number]: number } },
  shouldPlayerReceiveStrokeOnHole: (player: PersonalGamePlayer, playerIndex: number, holeIndex: number) => boolean
): number {
  if (!game || !game.wolfOrder || game.wolfOrder.length === 0) return -1;
  
  if (currentHole >= 16) {
    const playerPoints = game.players.map((player: PersonalGamePlayer, idx: number) => {
      let totalPoints = 0;
      for (let hole = 1; hole < currentHole; hole++) {
        const holePoints = calculateWolfPointsForHole(hole, game, holeScores, shouldPlayerReceiveStrokeOnHole);
        totalPoints += holePoints[idx] || 0;
      }
      return { idx, totalPoints };
    });

    const minPoints = Math.min(...playerPoints.map((p: { idx: number; totalPoints: number }) => p.totalPoints));
    const playersWithMinPoints = playerPoints.filter((p: { idx: number; totalPoints: number }) => p.totalPoints === minPoints);

    if (playersWithMinPoints.length === 1) {
      return playersWithMinPoints[0].idx;
    } else {
      const wolfOrderIndex = (currentHole - 1) % game.wolfOrder.length;
      
      for (let i = 0; i < game.wolfOrder.length; i++) {
        const checkIndex = (wolfOrderIndex + i) % game.wolfOrder.length;
        const playerIdx = game.wolfOrder[checkIndex];
        if (playersWithMinPoints.some((p: { idx: number; totalPoints: number }) => p.idx === playerIdx)) {
          return playerIdx;
        }
      }
      return playersWithMinPoints[0].idx;
    }
  }
  
  const wolfOrderIndex = (currentHole - 1) % game.wolfOrder.length;
  return game.wolfOrder[wolfOrderIndex];
}
