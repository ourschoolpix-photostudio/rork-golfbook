import { Member } from '@/types';

export type BoardMemberRole =
  | 'Admin'
  | 'President'
  | 'VP'
  | 'Tournament Director'
  | 'Handicap Director'
  | 'Operations'
  | 'Financer'
  | 'Member Relations';

export function hasRole(user: Member | null, role: BoardMemberRole): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;
  
  const normalizedRole = role === 'VP' ? 'vice-president' : role.toLowerCase();
  const userRoles = user.boardMemberRoles?.map(r => r.toLowerCase()) || [];
  
  return user.boardMemberRoles?.includes(role) || userRoles.includes(normalizedRole);
}

export function hasAnyRole(user: Member | null, roles: BoardMemberRole[]): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;
  
  const userRoles = user.boardMemberRoles?.map(r => r.toLowerCase()) || [];
  return roles.some(role => {
    const normalizedRole = role === 'VP' ? 'vice-president' : role.toLowerCase();
    return user.boardMemberRoles?.includes(role) || userRoles.includes(normalizedRole);
  });
}

export function canViewRegistration(user: Member | null): boolean {
  return hasAnyRole(user, [
    'Admin',
    'President',
    'VP',
    'Tournament Director',
    'Handicap Director',
    'Member Relations',
    'Financer',
    'Operations',
  ]);
}

export function canModifyOnlineCourseHandicap(user: Member | null): boolean {
  return hasRole(user, 'Admin');
}

export function canStartEvent(user: Member | null): boolean {
  return hasRole(user, 'Admin');
}

export function canRemoveAllPlayers(user: Member | null): boolean {
  return hasRole(user, 'Admin');
}

export function canManageGroupings(user: Member | null): boolean {
  return hasAnyRole(user, [
    'Admin',
    'President',
    'VP',
    'Tournament Director',
    'Handicap Director',
    'Member Relations',
    'Financer',
    'Operations',
  ]);
}

export function canEditLeaderboard(user: Member | null): boolean {
  return hasRole(user, 'Admin');
}

export function canAddExpensesGains(user: Member | null): boolean {
  return hasAnyRole(user, ['Admin', 'Financer']);
}

export function canViewFinance(user: Member | null): boolean {
  return hasAnyRole(user, [
    'Admin',
    'President',
    'VP',
    'Tournament Director',
    'Handicap Director',
    'Member Relations',
    'Financer',
    'Operations',
  ]);
}

export function canAccessPlayerManagement(user: Member | null): boolean {
  return hasAnyRole(user, [
    'Admin',
    'President',
    'VP',
    'Tournament Director',
    'Handicap Director',
    'Member Relations',
  ]);
}

export function canAccessEventManagement(user: Member | null): boolean {
  return hasAnyRole(user, [
    'Admin',
    'President',
    'VP',
    'Tournament Director',
    'Handicap Director',
    'Member Relations',
  ]);
}

export function canAccessFinancialSummary(user: Member | null): boolean {
  return hasAnyRole(user, [
    'Admin',
    'President',
    'VP',
    'Tournament Director',
    'Handicap Director',
    'Member Relations',
    'Financer',
    'Operations',
  ]);
}

export function canAccessBulkUpdate(user: Member | null): boolean {
  return hasRole(user, 'Admin');
}

export function canAccessSettings(user: Member | null): boolean {
  return hasRole(user, 'Admin');
}

export function canAccessBackupRestore(user: Member | null): boolean {
  return hasRole(user, 'Admin');
}

export function canAccessAlertsManagement(user: Member | null): boolean {
  return hasAnyRole(user, [
    'Admin',
    'President',
    'VP',
    'Tournament Director',
    'Handicap Director',
    'Member Relations',
    'Financer',
    'Operations',
  ]);
}

export function canTogglePaymentStatus(user: Member | null): boolean {
  return hasAnyRole(user, [
    'Admin',
    'President',
    'VP',
    'Tournament Director',
    'Handicap Director',
    'Member Relations',
    'Financer',
    'Operations',
  ]);
}

export function canAddPlayers(user: Member | null): boolean {
  return hasAnyRole(user, [
    'Admin',
    'President',
    'VP',
    'Tournament Director',
    'Handicap Director',
    'Member Relations',
  ]);
}

export function canViewTournamentHandicap(user: Member | null): boolean {
  return hasAnyRole(user, [
    'Admin',
    'President',
    'VP',
    'Tournament Director',
    'Handicap Director',
    'Member Relations',
    'Financer',
    'Operations',
  ]);
}

export function canVerifyScorecard(user: Member | null): boolean {
  return hasRole(user, 'Admin');
}
