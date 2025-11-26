import { PersonalGamePlayer, PotPlayer } from '@/types';

export type NetscoreResult = {
  playerName: string;
  front9Score: number;
  back9Score: number;
  overallScore: number;
  front9Net: number;
  back9Net: number;
  overallNet: number;
  memberId?: string;
};

export type NetscoreBetResults = {
  front9Winner?: string;
  back9Winner?: string;
  overallWinner?: string;
  potWinner?: string;
};

export type PlayerPayment = { 
  name: string; 
  front9Amount: number;
  back9Amount: number;
  overallAmount: number;
  potAmount: number;
  totalAmount: number;
  memberId?: string;
};

export type Transaction = { from: string; to: string; amount: number };

export function calculateNetScore(
  scores: number[],
  holePars: number[],
  handicap: number
): { front9Net: number; back9Net: number; overallNet: number; front9Gross: number; back9Gross: number; overallGross: number } {
  if (scores.length !== 18 || holePars.length !== 18) {
    return { front9Net: 0, back9Net: 0, overallNet: 0, front9Gross: 0, back9Gross: 0, overallGross: 0 };
  }

  const front9Scores = scores.slice(0, 9).filter(s => s > 0);
  const back9Scores = scores.slice(9, 18).filter(s => s > 0);

  const front9Gross = front9Scores.length === 9 ? front9Scores.reduce((sum, s) => sum + s, 0) : 0;
  const back9Gross = back9Scores.length === 9 ? back9Scores.reduce((sum, s) => sum + s, 0) : 0;
  const overallGross = front9Gross + back9Gross;

  const front9Net = front9Gross > 0 ? front9Gross - Math.floor(handicap / 2) : 0;
  const back9Net = back9Gross > 0 ? back9Gross - Math.ceil(handicap / 2) : 0;
  const overallNet = overallGross > 0 ? overallGross - handicap : 0;

  return { front9Net, back9Net, overallNet, front9Gross, back9Gross, overallGross };
}

export function calculateNetscoreResults(
  players: PersonalGamePlayer[],
  holePars: number[],
  potPlayers?: PotPlayer[]
): NetscoreResult[] {
  const playerResults: NetscoreResult[] = players.map(player => {
    const { front9Net, back9Net, overallNet, front9Gross, back9Gross, overallGross } = calculateNetScore(
      player.scores,
      holePars,
      player.handicap
    );

    return {
      playerName: player.name,
      front9Score: front9Gross,
      back9Score: back9Gross,
      overallScore: overallGross,
      front9Net,
      back9Net,
      overallNet,
      memberId: player.memberId,
    };
  });

  if (potPlayers && potPlayers.length > 0) {
    potPlayers.forEach(potPlayer => {
      playerResults.push({
        playerName: potPlayer.name,
        front9Score: 0,
        back9Score: 0,
        overallScore: 0,
        front9Net: 0,
        back9Net: 0,
        overallNet: 0,
        memberId: potPlayer.memberId,
      });
    });
  }

  return playerResults;
}

export function determineWinners(results: NetscoreResult[]): NetscoreBetResults {
  const validFront9 = results.filter(r => r.front9Net > 0);
  const validBack9 = results.filter(r => r.back9Net > 0);
  const validOverall = results.filter(r => r.overallNet > 0);
  const validPot = results.filter(r => r.front9Net > 0 && r.back9Net > 0);

  let front9Winner: string | undefined;
  let back9Winner: string | undefined;
  let overallWinner: string | undefined;
  let potWinner: string | undefined;

  if (validFront9.length > 0) {
    const minFront9 = Math.min(...validFront9.map(r => r.front9Net));
    const winners = validFront9.filter(r => r.front9Net === minFront9);
    front9Winner = winners.length === 1 ? winners[0].playerName : undefined;
  }

  if (validBack9.length > 0) {
    const minBack9 = Math.min(...validBack9.map(r => r.back9Net));
    const winners = validBack9.filter(r => r.back9Net === minBack9);
    back9Winner = winners.length === 1 ? winners[0].playerName : undefined;
  }

  if (validOverall.length > 0) {
    const minOverall = Math.min(...validOverall.map(r => r.overallNet));
    const winners = validOverall.filter(r => r.overallNet === minOverall);
    overallWinner = winners.length === 1 ? winners[0].playerName : undefined;
  }

  if (validPot.length > 0) {
    const minPot = Math.min(...validPot.map(r => r.overallNet));
    const winners = validPot.filter(r => r.overallNet === minPot);
    potWinner = winners.length === 1 ? winners[0].playerName : undefined;
  }

  return { front9Winner, back9Winner, overallWinner, potWinner };
}

export function calculatePayments(
  game: any
): {
  playerPayments: PlayerPayment[];
  transactions: Transaction[];
} | null {
  if (!game || game.gameType !== 'individual-net') return null;

  const hasBets = (game.front9Bet && game.front9Bet > 0) || 
                  (game.back9Bet && game.back9Bet > 0) || 
                  (game.overallBet && game.overallBet > 0) ||
                  (game.potBet && game.potBet > 0);
  
  if (!hasBets) return null;

  const results = calculateNetscoreResults(game.players, game.holePars, game.potPlayers);
  const winners = determineWinners(results);

  const allPlayersForPot = [...game.players.map((p: PersonalGamePlayer) => ({ 
    name: p.name, 
    memberId: p.memberId 
  }))];
  
  if (game.potPlayers) {
    allPlayersForPot.push(...game.potPlayers.map((p: PotPlayer) => ({ 
      name: p.name, 
      memberId: p.memberId 
    })));
  }

  const numPlayersInGroup = game.players.length;
  const numPlayersInPot = allPlayersForPot.length;

  const playerPayments: PlayerPayment[] = [];

  for (const player of allPlayersForPot) {
    let front9Amount = 0;
    let back9Amount = 0;
    let overallAmount = 0;
    let potAmount = 0;

    const isInGroup = game.players.some((p: PersonalGamePlayer) => p.name === player.name);

    if (game.front9Bet && winners.front9Winner === player.name && isInGroup) {
      front9Amount = game.front9Bet * (numPlayersInGroup - 1);
    } else if (game.front9Bet && winners.front9Winner && winners.front9Winner !== player.name && isInGroup) {
      front9Amount = -game.front9Bet;
    }

    if (game.back9Bet && winners.back9Winner === player.name && isInGroup) {
      back9Amount = game.back9Bet * (numPlayersInGroup - 1);
    } else if (game.back9Bet && winners.back9Winner && winners.back9Winner !== player.name && isInGroup) {
      back9Amount = -game.back9Bet;
    }

    if (game.overallBet && winners.overallWinner === player.name && isInGroup) {
      overallAmount = game.overallBet * (numPlayersInGroup - 1);
    } else if (game.overallBet && winners.overallWinner && winners.overallWinner !== player.name && isInGroup) {
      overallAmount = -game.overallBet;
    }

    if (game.potBet && winners.potWinner === player.name) {
      potAmount = game.potBet * (numPlayersInPot - 1);
    } else if (game.potBet && winners.potWinner && winners.potWinner !== player.name) {
      potAmount = -game.potBet;
    }

    const totalAmount = front9Amount + back9Amount + overallAmount + potAmount;

    playerPayments.push({
      name: player.name,
      front9Amount,
      back9Amount,
      overallAmount,
      potAmount,
      totalAmount,
      memberId: player.memberId,
    });
  }

  const transactions = simplifyTransactions(playerPayments);

  return { playerPayments, transactions };
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
