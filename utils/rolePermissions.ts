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
  return user.boardMemberRoles?.includes(role) || false;
}

export function hasAnyRole(user: Member | null, roles: BoardMemberRole[]): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;
  return roles.some(role => user.boardMemberRoles?.includes(role));
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

export function canTogglePaymentStatus(user: Member | null): boolean {
  return hasAnyRole(user, [
    'Admin',
    'President',
    'VP',
    'Tournament Director',
    'Handicap Director',
    'Member Relations',
    'Financer',
  ]);
}
