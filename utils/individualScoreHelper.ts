import { PersonalGame, PersonalGamePlayer, PotPlayer } from '@/types';

export type IndividualScoreResult = {
  playerName: string;
  playerIndex: number;
  front9Gross: number;
  back9Gross: number;
  overallGross: number;
  front9Net: number;
  back9Net: number;
  overallNet: number;
  memberId?: string;
};

export type IndividualScoreWinners = {
  front9Winner: number | null;
  back9Winner: number | null;
  overallWinner: number | null;
};

export type PlayerPayment = {
  name: string;
  playerIndex: number;
  front9Amount: number;
  back9Amount: number;
  overallAmount: number;
  potAmount: number;
  totalAmount: number;
  memberId?: string;
};

export type Transaction = { from: string; to: string; amount: number };

export function calculateIndividualScoreForPlayer(
  player: PersonalGamePlayer,
  playerIndex: number,
  game: PersonalGame,
  holeScores: { [playerIndex: number]: { [hole: number]: number } },
  shouldPlayerReceiveStrokeOnHole: (player: PersonalGamePlayer, playerIndex: number, holeIndex: number) => boolean
): IndividualScoreResult {
  const useHandicaps = game.useHandicaps ?? true;

  let front9Gross = 0;
  let back9Gross = 0;
  let overallGross = 0;

  for (let hole = 1; hole <= 18; hole++) {
    const score = holeScores[playerIndex]?.[hole] || 0;
    if (score > 0) {
      if (hole <= 9) {
        front9Gross += score;
      } else {
        back9Gross += score;
      }
      overallGross += score;
    }
  }

  let front9Net = front9Gross;
  let back9Net = back9Gross;
  let overallNet = overallGross;

  if (useHandicaps && front9Gross > 0 && back9Gross > 0) {
    front9Net = front9Gross - Math.floor(player.handicap / 2);
    back9Net = back9Gross - Math.ceil(player.handicap / 2);
    overallNet = overallGross - player.handicap;
  } else if (!useHandicaps && (player.strokesReceived || 0) > 0) {
    let front9StrokesUsed = 0;
    let back9StrokesUsed = 0;

    for (let hole = 1; hole <= 9; hole++) {
      const score = holeScores[playerIndex]?.[hole];
      if (score && score > 0 && shouldPlayerReceiveStrokeOnHole(player, playerIndex, hole - 1)) {
        front9StrokesUsed++;
      }
    }

    for (let hole = 10; hole <= 18; hole++) {
      const score = holeScores[playerIndex]?.[hole];
      if (score && score > 0 && shouldPlayerReceiveStrokeOnHole(player, playerIndex, hole - 1)) {
        back9StrokesUsed++;
      }
    }

    if (front9Gross > 0) front9Net = front9Gross - front9StrokesUsed;
    if (back9Gross > 0) back9Net = back9Gross - back9StrokesUsed;
    if (overallGross > 0) overallNet = overallGross - (front9StrokesUsed + back9StrokesUsed);
  }

  return {
    playerName: player.name,
    playerIndex,
    front9Gross,
    back9Gross,
    overallGross,
    front9Net,
    back9Net,
    overallNet,
    memberId: player.memberId,
  };
}

export function determineWinners(
  game: PersonalGame,
  holeScores: { [playerIndex: number]: { [hole: number]: number } },
  shouldPlayerReceiveStrokeOnHole: (player: PersonalGamePlayer, playerIndex: number, holeIndex: number) => boolean
): IndividualScoreWinners {
  const results: IndividualScoreResult[] = [];

  for (let i = 0; i < game.players.length; i++) {
    const result = calculateIndividualScoreForPlayer(
      game.players[i],
      i,
      game,
      holeScores,
      shouldPlayerReceiveStrokeOnHole
    );
    results.push(result);
  }

  const validFront9 = results.filter(r => r.front9Net > 0);
  const validBack9 = results.filter(r => r.back9Net > 0);
  const validOverall = results.filter(r => r.overallNet > 0);

  let front9Winner: number | null = null;
  let back9Winner: number | null = null;
  let overallWinner: number | null = null;

  if (validFront9.length > 0) {
    const minFront9 = Math.min(...validFront9.map(r => r.front9Net));
    const winners = validFront9.filter(r => r.front9Net === minFront9);
    if (winners.length === 1) {
      front9Winner = winners[0].playerIndex;
    }
  }

  if (validBack9.length > 0) {
    const minBack9 = Math.min(...validBack9.map(r => r.back9Net));
    const winners = validBack9.filter(r => r.back9Net === minBack9);
    if (winners.length === 1) {
      back9Winner = winners[0].playerIndex;
    }
  }

  if (validOverall.length > 0) {
    const minOverall = Math.min(...validOverall.map(r => r.overallNet));
    const winners = validOverall.filter(r => r.overallNet === minOverall);
    if (winners.length === 1) {
      overallWinner = winners[0].playerIndex;
    }
  }

  return { front9Winner, back9Winner, overallWinner };
}

export function calculatePayments(
  game: PersonalGame,
  holeScores: { [playerIndex: number]: { [hole: number]: number } },
  shouldPlayerReceiveStrokeOnHole: (player: PersonalGamePlayer, playerIndex: number, holeIndex: number) => boolean
): {
  playerPayments: PlayerPayment[];
  transactions: Transaction[];
  winners: IndividualScoreWinners;
  results: IndividualScoreResult[];
} | null {
  if (!game || game.gameType !== 'individual-net') return null;

  const hasBets =
    (game.front9Bet && game.front9Bet > 0) ||
    (game.back9Bet && game.back9Bet > 0) ||
    (game.overallBet && game.overallBet > 0) ||
    (game.potBet && game.potBet > 0);

  if (!hasBets) return null;

  const winners = determineWinners(game, holeScores, shouldPlayerReceiveStrokeOnHole);
  const results: IndividualScoreResult[] = [];

  for (let i = 0; i < game.players.length; i++) {
    const result = calculateIndividualScoreForPlayer(
      game.players[i],
      i,
      game,
      holeScores,
      shouldPlayerReceiveStrokeOnHole
    );
    results.push(result);
  }

  const allPlayers = [...game.players];
  const allPotPlayers = [
    ...game.players.map((p, idx) => ({ name: p.name, handicap: p.handicap, memberId: p.memberId, isMainPlayer: true, mainPlayerIndex: idx })),
    ...(game.potPlayers || []).map(p => ({ name: p.name, handicap: p.handicap, memberId: p.memberId, isMainPlayer: false, mainPlayerIndex: -1 })),
  ];

  const numPlayersInGroup = game.players.length;
  const numPlayersInPot = allPotPlayers.length;

  const playerPayments: PlayerPayment[] = [];

  for (let i = 0; i < game.players.length; i++) {
    const player = game.players[i];
    let front9Amount = 0;
    let back9Amount = 0;
    let overallAmount = 0;
    let potAmount = 0;

    if (game.front9Bet && game.front9Bet > 0) {
      if (winners.front9Winner === i) {
        front9Amount = game.front9Bet * (numPlayersInGroup - 1);
      } else if (winners.front9Winner !== null) {
        front9Amount = -game.front9Bet;
      }
    }

    if (game.back9Bet && game.back9Bet > 0) {
      if (winners.back9Winner === i) {
        back9Amount = game.back9Bet * (numPlayersInGroup - 1);
      } else if (winners.back9Winner !== null) {
        back9Amount = -game.back9Bet;
      }
    }

    if (game.overallBet && game.overallBet > 0) {
      if (winners.overallWinner === i) {
        overallAmount = game.overallBet * (numPlayersInGroup - 1);
      } else if (winners.overallWinner !== null) {
        overallAmount = -game.overallBet;
      }
    }

    if (game.potBet && game.potBet > 0) {
      if (winners.overallWinner === i) {
        potAmount = game.potBet * (numPlayersInPot - 1);
      } else if (winners.overallWinner !== null) {
        potAmount = -game.potBet;
      }
    }

    const totalAmount = front9Amount + back9Amount + overallAmount + potAmount;

    playerPayments.push({
      name: player.name,
      playerIndex: i,
      front9Amount,
      back9Amount,
      overallAmount,
      potAmount,
      totalAmount,
      memberId: player.memberId,
    });
  }

  if (game.potPlayers && game.potPlayers.length > 0) {
    for (const potPlayer of game.potPlayers) {
      let potAmount = 0;

      if (game.potBet && game.potBet > 0 && winners.overallWinner !== null) {
        potAmount = -game.potBet;
      }

      playerPayments.push({
        name: potPlayer.name,
        playerIndex: -1,
        front9Amount: 0,
        back9Amount: 0,
        overallAmount: 0,
        potAmount,
        totalAmount: potAmount,
        memberId: potPlayer.memberId,
      });
    }
  }

  const transactions = simplifyTransactions(playerPayments);

  return { playerPayments, transactions, winners, results };
}

function simplifyTransactions(playerPayments: PlayerPayment[]): Transaction[] {
  const balances: { [name: string]: number } = {};

  playerPayments.forEach(p => {
    balances[p.name] = p.totalAmount;
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
        amount: Math.round(amount * 100) / 100,
      });
    }

    creditor.balance -= amount;
    debtor.balance -= amount;

    if (creditor.balance < 0.01) i++;
    if (debtor.balance < 0.01) j++;
  }

  return simplified;
}
